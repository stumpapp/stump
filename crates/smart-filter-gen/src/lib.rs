mod enum_data;
mod gen_match_arms;

use std::fmt::Display;

use proc_macro2::Span;
use quote::{format_ident, quote};
use syn::{parse_macro_input, Attribute, Data, DeriveInput, Ident};

use crate::{enum_data::DestructedEnum, gen_match_arms::generate_match_arm};

/// Used to generate a smart filter from an enum definition.
///
/// This macro generates a new enum where each variant wraps the original type with
/// a `Filter` type. It also implements a conversion method `into_params`, which
/// transforms the enum into a Prisma filter parameter.
///
/// # Examples
///
/// To apply the macro to an enum `MyFilter`, apply the macro attribute to the top
/// of the enum and define the `prisma_table` attribute:
///
/// ```
/// #[generate_smart_filter]
/// #[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Type, ToSchema)]
/// #[serde(untagged)]
/// #[prisma_table("my_table")]
/// enum MyFilter {
///   Age { age: u32 },
///   Name { name: String },
/// }
/// ```
///
/// This will generate the following code:
///
/// ```
/// #[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Type, ToSchema)]
/// #[serde(untagged)]
/// enum MyFilter {
///   Age { age: Filter<u32> },
///   Name { name: Filter<String> },
/// }
///
/// impl MyFilter {
///   pub fn into_params(self) -> prisma::WhereParam { ... }
/// }
/// ```
///
/// # Notes
///
/// This is an attribute macro and thus will _replace_ the entire definition that
/// it is applied to with its own generated content.
#[proc_macro_attribute]
pub fn generate_smart_filter(
	_attrs: proc_macro::TokenStream,
	input: proc_macro::TokenStream,
) -> proc_macro::TokenStream {
	let ast = parse_macro_input!(input as DeriveInput);

	if let Data::Enum(enum_data) = &ast.data {
		let enum_ident = &ast.ident;
		let mut enum_attrs = ast.attrs.clone();
		let prisma_table = extract_prisma_table(&mut enum_attrs);

		// Take apart the enum, returning an error if something prevents proper parsing
		let destructured_enum = match enum_data::destructure_enum(enum_data) {
			Ok(value) => value,
			Err(e) => return e.into(),
		};

		let generated_enum_def =
			gen_smart_filter_enum(enum_ident, &destructured_enum, &enum_attrs);

		let generated_impls =
			gen_smart_filter_impls(enum_ident, &destructured_enum, &prisma_table);

		let tokens = quote! {
		  #generated_enum_def

		  #generated_impls
		};

		tokens.into()
	} else {
		macro_error(ast.ident.span(), "generate_smart_filter expects an enum").into()
	}
}

/// A helper function to extract the `#[prisma_table = "value"]` attribute value.
fn extract_prisma_table(attrs: &mut Vec<Attribute>) -> Ident {
	let mut prisma_table: Option<String> = None;

	// Retain only the attributes that are not `prisma_table`
	attrs.retain(|attr| {
		if attr.path().is_ident("prisma_table") {
			// Parse the attribute using parse_args to extract the string value
			attr.parse_args::<syn::LitStr>()
				.map(|lit_str| {
					prisma_table = Some(lit_str.value());
				})
				.unwrap_or_else(|_| panic!("Invalid prisma_table attribute format"));

			false // Remove this attribute
		} else {
			true // Keep other attributes
		}
	});

	let prisma_table = prisma_table
		.unwrap_or_else(|| panic!("The prisma_table attribute must be defined"));
	format_ident!("{prisma_table}")
}

/// Generates the enum portion of the smart filter macro output.
///
/// This function automatically wraps inputs with `Filter` so that for a field having
/// type `T` you'll end up with an enum being created with inner type `Filter<T>` This
/// only applies to types `String` and number types (i.e., `u32`, `i32`, etc.), other
/// types are assumed to be their own smart filters and are not wrapped.
fn gen_smart_filter_enum(
	ident: &Ident,
	data: &DestructedEnum,
	enum_attrs: &Vec<syn::Attribute>,
) -> proc_macro2::TokenStream {
	let enum_attr_tokens = quote! { #(#enum_attrs)* };

	let variant_tokens: Vec<_> = data
		.variants
		.iter()
		.map(|variant_data| {
			let name = &variant_data.variable_name;
			let inner_name = &variant_data.variable_inner_name;
			let ty = &variant_data.variable_type;

			if enum_data::should_filter_type(ty) {
				quote! { #name { #inner_name: Filter<#ty> } }
			} else {
				// If not a filter type then the type can be passed through.
				quote! { #name { #inner_name: #ty } }
			}
		})
		.collect();

	let tokens = quote! {
	  #enum_attr_tokens
	  pub enum #ident {
	  #(#variant_tokens),*
	  }
	};

	tokens
}

/// Generates the `impl` block for the generated smart filter enum.
///
/// This will look like:
/// ```
/// impl [ENUM NAME] {
///   pub fn into_params(self) -> [prisma_table]::WhereParam {
///     match self {
///       [GENERATED MATCH TOKENS]
///     }
///   }
/// }
/// ```
fn gen_smart_filter_impls(
	ident: &Ident,
	data: &DestructedEnum,
	prisma_table: &Ident,
) -> proc_macro2::TokenStream {
	let match_tokens: Vec<_> = data
		.variants
		.iter()
		.map(|variant_data| generate_match_arm(ident, variant_data, prisma_table))
		.collect();

	quote! {
	  impl #ident {
	  pub fn into_params(self) -> #prisma_table::WhereParam {
		match self {
		  #(#match_tokens),*
		}
	  }
	  }
	}
}

fn macro_error<T: Display>(span: Span, message: T) -> proc_macro2::TokenStream {
	syn::Error::new(span, message).into_compile_error()
}
