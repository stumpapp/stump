use quote::{format_ident, quote};
use syn::{Ident, Type};

use crate::{enum_data::EnumVariant, macro_error};

pub fn generate_match_arm(
	ident: &Ident,
	variant_data: &EnumVariant,
	prisma_table: &Ident,
) -> proc_macro2::TokenStream {
	match &variant_data.variable_type {
		Type::Path(type_path) => {
			if let Some(type_ident) = type_path.path.segments.last() {
				let ident_str = type_ident.ident.to_string();
				match ident_str.as_str() {
					// Handle String type
					"String" => {
						return generate_string_match_arm(
							ident,
							variant_data,
							prisma_table,
						);
					},
					// Handle Number types
					"u64" | "u32" | "u16" | "u8" | "i64" | "i32" | "i16" | "i8"
					| "DateTime" => {
						return generate_number_match_arm(
							ident,
							variant_data,
							prisma_table,
						);
					},
					_ => {
						return generate_filter_match_arm(
							ident,
							variant_data,
							prisma_table,
						)
					},
				}
			}

			macro_error(variant_data.span, "Unsupported type")
		},
		_ => macro_error(variant_data.span, "Unsupported type"),
	}
}

fn generate_string_match_arm(
	ident: &Ident,
	variant_data: &EnumVariant,
	prisma_table: &Ident,
) -> proc_macro2::TokenStream {
	let name = &variant_data.variable_name;
	let inner_name = &variant_data.variable_inner_name;

	let into_fn = if variant_data.is_optional {
		format_ident!("into_optional_params")
	} else {
		format_ident!("into_params")
	};

	quote! {
	  #ident::#name { #inner_name } => #inner_name.#into_fn(
		#prisma_table::#inner_name::equals,
		#prisma_table::#inner_name::contains,
		#prisma_table::#inner_name::in_vec,
	  )
	}
}

fn generate_number_match_arm(
	ident: &Ident,
	variant_data: &EnumVariant,
	prisma_table: &Ident,
) -> proc_macro2::TokenStream {
	let name = &variant_data.variable_name;
	let inner_name = &variant_data.variable_inner_name;

	let into_fn = if variant_data.is_optional {
		format_ident!("into_optional_numeric_params")
	} else {
		format_ident!("into_numeric_params")
	};

	quote! {
	  #ident::#name { #inner_name } => #inner_name.#into_fn(
		#prisma_table::#inner_name::equals,
		#prisma_table::#inner_name::gt,
		#prisma_table::#inner_name::gte,
		#prisma_table::#inner_name::lt,
		#prisma_table::#inner_name::lte,
	  )
	}
}

fn generate_filter_match_arm(
	ident: &Ident,
	variant_data: &EnumVariant,
	prisma_table: &Ident,
) -> proc_macro2::TokenStream {
	let name = &variant_data.variable_name;
	let inner_name = &variant_data.variable_inner_name;

	let into_fn = if variant_data.is_optional {
		format_ident!("into_optional_params")
	} else {
		format_ident!("into_params")
	};

	let inner_name_str = inner_name.to_string();

	// Note: This is a temporary hack until the migration to SeaORM is complete and a better
	// smart filter solution is in place.
	let method = if inner_name_str == "tags" {
		format_ident!("some")
	} else {
		format_ident!("is")
	};

	quote! {
	  #ident::#name { #inner_name } => {
	  #prisma_table::#inner_name::#method(vec![#inner_name.#into_fn()])
	}
	}
}
