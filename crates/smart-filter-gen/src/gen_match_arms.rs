use quote::{format_ident, quote};
use syn::{Ident, Type};

use crate::enum_data::EnumVariant;

pub(crate) fn generate_match_arm(
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

			panic!("Unsupported type");
		},
		_ => panic!("Unsupported type"),
	}
}

fn generate_string_match_arm(
	ident: &Ident,
	variant_data: &EnumVariant,
	prisma_table: &Ident,
) -> proc_macro2::TokenStream {
	let name = &variant_data.variable_name;
	let inner_name = &variant_data.variable_inner_name;

	let into_fn = match variant_data.is_optional {
		true => format_ident!("into_optional_params"),
		false => format_ident!("into_params"),
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

	let into_fn = match variant_data.is_optional {
		true => format_ident!("into_optional_numeric_params"),
		false => format_ident!("into_numeric_params"),
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

	let into_fn = match variant_data.is_optional {
		true => format_ident!("into_optional_params"),
		false => format_ident!("into_params"),
	};

	quote! {
	  #ident::#name { #inner_name } => {
	  #prisma_table::#inner_name::is(vec![#inner_name.#into_fn()])
	}
	}
}
