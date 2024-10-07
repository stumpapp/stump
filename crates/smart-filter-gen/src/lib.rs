use proc_macro2::Span;
use quote::{format_ident, quote};
use syn::{
	parse_macro_input, spanned::Spanned, Attribute, Data, DataEnum, DeriveInput, Ident,
	Type,
};

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
		let destructured_enum = destructure_enum(enum_data);

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
		panic!("generate_smart_filter expects an enum");
	}
}

/// A helper function to extract the prisma_table attribute value.
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

struct EnumVariant {
	pub span: Span,
	pub variable_name: Ident,
	pub variable_inner_name: Ident,
	pub variable_type: Type,
	pub is_optional: bool,
}

struct DestructedEnum {
	pub variants: Vec<EnumVariant>,
}

fn destructure_enum(enum_data: &DataEnum) -> DestructedEnum {
	let mut variants = Vec::new();
	for variant in &enum_data.variants {
		let variable_name = &variant.ident;

		// We need to take the first field to construct the enum
		// So here we're checking that there's one and only one field.
		if variant.fields.is_empty() || variant.fields.len() > 1 {
			panic!("Each variant is expected to have one and only one field defining its inner content.");
		}

		// Assuming that passed, we'll take the first field
		let field: &syn::Field = variant.fields.iter().next().unwrap();
		let is_optional = get_is_optional_attr(&variant.attrs);

		// Extract the variable inner name and type
		let variable_inner_name = match &field.ident {
			Some(ident) => ident.clone(),
			None => panic!("Expected the variant field to have a name."),
		};

		variants.push(EnumVariant {
			span: variant.span(),
			variable_name: variable_name.clone(),
			variable_inner_name,
			variable_type: field.ty.clone(),
			is_optional,
		})
	}

	DestructedEnum { variants }
}

fn get_is_optional_attr(attrs: &Vec<Attribute>) -> bool {
	for attr in attrs {
		if attr.path().is_ident("is_optional") {
			return true;
		}
	}

	false
}

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

			if should_filter_type(ty) {
				quote! { #name { #inner_name: Filter<#ty> } }
			} else {
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

fn should_filter_type(ty: &Type) -> bool {
	match ty {
		Type::Path(type_path) => {
			if let Some(type_ident) = type_path.path.segments.last() {
				let ident_str = type_ident.ident.to_string();
				match ident_str.as_str() {
					// If it's a String or numeric type, we want to add a Filter<T>
					"String" | "u64" | "u32" | "u16" | "u8" | "i64" | "i32" | "i16"
					| "i8" => {
						return true;
					},
					// Otherwise it's already a filter
					_ => return false,
				}
			}

			panic!("Unsupported type");
		},
		_ => panic!("Unsupported type"),
	}
}

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

fn generate_match_arm(
	ident: &Ident,
	variant_data: &EnumVariant,
	prisma_table: &Ident,
) -> proc_macro2::TokenStream {
	let ty = variant_data.variable_type.clone();
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
					"u64" | "u32" | "u16" | "u8" | "i64" | "i32" | "i16" | "i8" => {
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
