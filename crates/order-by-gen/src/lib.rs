extern crate proc_macro;

mod snake_case;

use crate::snake_case::ToSnakeCase;
use proc_macro::TokenStream;
use quote::{format_ident, quote};
use syn::{parse_macro_input, Data, DeriveInput, Fields};

// TODO: Vec<O> -> relation order
// TODO: O -> aggregate order? It might require some additional field attributes...

// FIXME: Fundamental misunderstanding with macros alert! See helpful feedback:
// Okay last one is a little more hairy. It looks like in basic.rs you're wanting the struct to which it is applied to use the function you define to provision the code that the macro outputs. E.g. lines 28, 34, 40, etc.
// That won't work. Macros can't call functions that are given to them because they get an uncompiled stream of tokens.
// The macro needs to generate any source code from the tokens it takes in with only functions defined internally.

/// Used to generate a prisma OrderByParam from an enum definition.
///
/// This macro implements a `IntoOrderBy`` trait for the enum, which is expected to
/// provide a method `into_prisma_order` to convert the enum into a Prisma OrderByParam
/// scoped to the #[prisma(module = "my_table")] attribute.
///
/// The enum must be annotated with the following attributes:
/// - `prisma` with the name of the module the OrderByParam is scoped to
///
/// Any non-unit variants must also derive `OrderByGen`, and will be scoped nested
/// under the enum.
///
/// # Examples
///
/// ```
/// #[derive(OrderByGen)]
/// #[prisma(module = "book_metadata")]
/// enum BookMetadataOrderBy {
///  Title,
/// }
///
/// #[derive(OrderByGen)]
/// #[prisma(module = "book")]
/// enum BookOrderBy {
///   Name,
///   Path,
///   SomePascalCase,
///   Metadata(Vec<BookMetadataOrderBy>),
/// }
/// ```
///
/// This will generate the following code:
///
/// ```
/// impl IntoOrderBy for BookMetadataOrderBy {
///   type OrderParam = crate::prisma::book::OrderByWithRelationParam;
///
///   fn into_prisma_order(self, dir: crate::prisma::SortOrder) -> Self::OrderParam {
///     match self {
///       BookMetadataOrderBy::Title => crate::prisma::book_metadata::title::order(dir),
///     }
///   }
/// }
///
/// impl IntoOrderBy for BookOrderBy {
///   type OrderParam = prisma::book::OrderByWithRelationParam;
///
///   fn into_prisma_order(self) -> Self::OrderParam {
///     match self {
///       BookOrderBy::Name => prisma::book::name::order(dir),
///       BookOrderBy::Path => prisma::book::path::order(dir),
///       BookOrderBy::SomePascalCase => prisma::book::some_pascal_case::order(dir),
///       BookOrderBy::Metadata(inner_vec) => media::metadata::order(inner_vec.into_iter().map(|f| f.into_prisma_order(dir)).collect()),
///     }
///   }
/// }
/// ```
#[proc_macro_derive(OrderByGen, attributes(prisma))]
pub fn order_by_gen(input: TokenStream) -> TokenStream {
	let input = parse_macro_input!(input as DeriveInput);

	// Get the enum name
	let enum_name = input.ident;

	// Get the prisma attribute
	let prisma_attr = input
		.attrs
		.iter()
		.find(|attr| attr.path().is_ident("prisma"))
		.expect("Expected a #[prisma(..)] attribute");

	// Extract the key/value pair from the attribute
	let (path, module_name) = prisma_attr
		.parse_args::<syn::MetaNameValue>()
		.map(|meta| (meta.path, meta.value))
		.expect("Expected a key-value attribute");

	// Assert the key is "module" (in the future, support others)
	if !path.is_ident("module") {
		panic!("Expected a #[prisma(module = \"..\")] attribute");
	}

	// We need module_value as a string literal
	let module_name = match module_name {
		syn::Expr::Lit(lit) => match lit.lit {
			syn::Lit::Str(s) => s.value(),
			_ => panic!("Expected a string literal"),
		},
		_ => panic!("Expected a string literal"),
	};

	let module_name_ident = format_ident!("{}", module_name);

	// Generate the match arms for each variant
	let match_arms = if let Data::Enum(data_enum) = &input.data {
		data_enum.variants.iter().map(|variant| {
			let variant_name = &variant.ident;

			let field_name =
				format_ident!("{}", variant_name.to_string().to_snake_case());

			match &variant.fields {
				Fields::Unit => {
					// Simple enum variant like `Title`
					quote! {
						#enum_name::#variant_name => crate::prisma::#module_name_ident::#field_name::order(dir),
					}
				},
				// TODO: distinguish between Vec<O> and O
				// TODO: is this right? docs unclear....
				Fields::Unnamed(fields) if fields.unnamed.len() == 1 => {
					quote! {
						#enum_name::#variant_name(inner_vec) => crate::prisma::#module_name_ident::#field_name::order(inner_vec.into_iter().map(|f| f.into_prisma_order(dir)).collect()),
					}
				},
				_ => panic!("Unsupported enum variant"),
			}
		})
	} else {
		panic!("OrderByGen can only be derived for enums");
	};

	// Generate the final implementation of IntoOrderBy
	let expanded = quote! {
		impl IntoOrderBy for #enum_name {
			type OrderParam = crate::prisma::#module_name_ident::OrderByWithRelationParam;

			fn into_prisma_order(self, dir: crate::prisma::SortOrder) -> Self::OrderParam {
				match self {
					#(#match_arms)*
				}
			}
		}
	};

	TokenStream::from(expanded)
}
