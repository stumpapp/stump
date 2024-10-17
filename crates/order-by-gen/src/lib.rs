extern crate proc_macro;

use proc_macro::TokenStream;
use quote::{format_ident, quote};
use syn::{parse_macro_input, Data, DeriveInput, Fields};

/// Used to generate a prisma OrderByParam from an enum definition.
///
/// This macro implements a generated IntoOrderBy trait for the enum, which
/// provides a method to convert the enum into a Prisma OrderByParam scoped
/// to the #[prisma_table("my_table")] attribute.
///
/// The enum must be annotated with the following attributes:
/// - `prisma_table` with the name of the table the OrderByParam is scoped to
///
/// Any non-unit variants must also derive `OrderByGen`, and will be scoped nested
/// under the enum.
///
/// # Examples
///
/// ```
/// #[derive(OrderByGen)]
/// #[prisma_module("book_metadata")]
/// enum BookMetadataOrderBy {
///  Title,
/// }
///
/// #[derive(OrderByGen)]
/// #[prisma_module("book")]
/// enum BookOrderBy {
///   Name,
///   Path,
///   Metadata(BookMetadataOrderBy),
/// }
/// ```
///
/// This will generate the following code:
///
/// ```
/// impl IntoOrderBy for BookMetadataOrderBy {
///   type OrderParam = prisma::book::OrderByWithRelationParam;
///
///   fn into_prisma_order(self, direction: prisma::SortOrder) -> Self::OrderParam {
///     match self {
///       BookMetadataOrderBy::Title => prisma::book_metadata::title::order(direction),
///     }
///   }
/// }
///
/// impl IntoOrderBy for BookOrderBy {
///   type OrderParam = prisma::book::OrderByWithRelationParam;
///
///   fn into_prisma_order(self, direction: prisma::SortOrder) -> Self::OrderParam {
///     match self {
///       BookOrderBy::Name => prisma::book::name::order(direction),
///       BookOrderBy::Path => prisma::book::path::order(direction),
///       BookOrderBy::Metadata(metadata) => metadata.into_prisma_order(direction),
///     }
///   }
/// }
/// ```
///
#[proc_macro_derive(OrderByGen)]
pub fn order_by_gen(input: TokenStream) -> TokenStream {
	let input = parse_macro_input!(input as DeriveInput);

	// Get the enum name
	let enum_name = input.ident;

	// Extract the `prisma` attribute with the table name
	let table_name = input
		.attrs
		.iter()
		.find_map(|attr| {
			if attr.path().is_ident("prisma_module") {
				Some(
					attr.parse_args::<syn::LitStr>()
						.expect("Expected a string literal")
						.value(),
				)
			} else {
				None
			}
		})
		.expect("Expected a #[prisma_module(\"table_name\")] attribute");

	// Generate the match arms for each variant
	let match_arms = if let Data::Enum(data_enum) = &input.data {
		data_enum.variants.iter().map(|variant| {
			let variant_name = &variant.ident;

			match &variant.fields {
				Fields::Unit => {
					// Simple enum variant like `Title`
					let field_name =
						format_ident!("{}", variant_name.to_string().to_lowercase());
					quote! {
						#enum_name::#variant_name => prisma::#table_name::#field_name::order(direction),
					}
				},
				Fields::Unnamed(fields) if fields.unnamed.len() == 1 => {
					// Tuple variant like `Metadata(MyMetadataOrderBy)`
					quote! {
						#enum_name::#variant_name(inner) => inner.into_prisma_order(direction),
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
			type OrderParam = prisma::#table_name::OrderByWithRelationParam;

			fn into_prisma_order(self, direction: prisma::SortOrder) -> Self::OrderParam {
				match self {
					#(#match_arms)*
				}
			}
		}
	};

	TokenStream::from(expanded)
}
