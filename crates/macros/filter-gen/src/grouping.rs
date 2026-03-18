use heck::ToUpperCamelCase;
use proc_macro2::TokenStream;
use quote::quote;
use std::collections::HashMap;
use syn::{parse2, spanned::Spanned, Error};

/// This macro generates an enum with variants for each groupable field of the struct.
/// It also generates a GraphQL input object and a method to convert to SeaORM Column.
///
/// Example:
/// ```
/// use filter_gen::Groupable;
/// #[derive(Groupable)]
/// struct Media {
///     #[groupable]
///     name: String,
///     #[groupable(join_path = "series")]
///     series_id: String,
/// }
/// ```
///
/// Would generate:
/// ```
/// #[derive(Debug, Clone, Copy, PartialEq, Eq, strum::EnumString, strum::Display, async_graphql::Enum)]
/// pub enum MediaGroupingField {
///     Name,
///     SeriesId,
/// }
///
/// #[derive(async_graphql::InputObject, Clone)]
/// pub struct MediaGroupBy {
///     pub field: MediaGroupingField,
/// }
///
/// impl MediaGroupingField {
///     pub fn to_column(&self) -> Column {
///         match self {
///             Self::Name => Column::Name,
///             Self::SeriesId => Column::SeriesId,
///         }
///     }
/// }
/// ```
pub fn grouping_impl(input: TokenStream) -> Result<TokenStream, syn::Error> {
	let input = parse2::<syn::DeriveInput>(input).map_err(|e| {
		Error::new(
			proc_macro2::Span::call_site(),
			format!("Failed to parse input: {}", e),
		)
	})?;

	let col_map = build_field_to_grouping_info_map(&input)?;

	let ident = get_ident_name(&input)?;

	let data = match input.data {
		syn::Data::Struct(data) => data,
		_ => {
			return Err(Error::new(
				proc_macro2::Span::call_site(),
				"Groupable can only be derived for structs",
			))
		},
	};

	let enum_ident = syn::Ident::new(&format!("{}GroupingField", ident), ident.span());
	let (enum_def, column_impl) =
		generate_enum_def(&ident, &enum_ident, &data.fields, &col_map)?;

	let group_by_ident = syn::Ident::new(&format!("{}GroupBy", ident), ident.span());
	let group_by_structs_def =
		generate_group_by_struct_def(&group_by_ident, &enum_ident)?;

	let output = quote! {
		#enum_def

		#group_by_structs_def

		#column_impl
	};

	Ok(output)
}

fn find_attr(
	attr_name: &str,
	attr_param: &str,
	attrs: &[syn::Attribute],
) -> Result<Option<String>, syn::Error> {
	let mut name = None;
	attrs
		.iter()
		.filter(|attr| attr.path().is_ident(attr_name))
		.try_for_each(|attr| {
			attr.parse_nested_meta(|meta| {
				if meta.path.is_ident(attr_param) {
					let text = meta.value()?.parse::<syn::LitStr>()?;
					name = Some(text.value());
					return Ok(());
				} else {
					let _: Option<syn::Expr> = meta.value().and_then(|v| v.parse()).ok();
				}

				Ok(())
			})
		})?;
	Ok(name)
}

const RAW_IDENTIFIER: &str = "r#";

#[derive(Debug, Clone, PartialEq)]
struct GroupingInfo {
	column_name: syn::Ident,
}

fn is_skip_column(attrs: &[syn::Attribute]) -> bool {
	attrs
		.iter()
		.filter(|attr| attr.path().is_ident("groupable"))
		.any(|attr| {
			let mut is_skip = false;
			let _ = attr.parse_nested_meta(|meta| {
				if meta.path.is_ident("skip") {
					is_skip = true;
					return Ok(());
				}
				Ok(())
			});
			is_skip
		})
}

fn build_field_to_grouping_info_map(
	input: &syn::DeriveInput,
) -> Result<HashMap<syn::Ident, GroupingInfo>, syn::Error> {
	let mut field_map = HashMap::new();

	if let syn::Data::Struct(item_struct) = &input.data {
		if let syn::Fields::Named(fields) = &item_struct.fields {
			for field in &fields.named {
				if let Some(ident) = &field.ident {
					if is_skip_column(&field.attrs) {
						continue;
					}

					let column_name = ident
						.to_string()
						.trim_start_matches(RAW_IDENTIFIER)
						.to_upper_camel_case();

					let column_name = syn::Ident::new(&column_name, ident.span());

					field_map.insert(ident.clone(), GroupingInfo { column_name });
				}
			}
		}
	}

	Ok(field_map)
}

fn generate_group_by_struct_def(
	group_by_ident: &syn::Ident,
	enum_ident: &syn::Ident,
) -> Result<TokenStream, syn::Error> {
	let group_by_struct_def = quote! {
		#[derive(async_graphql::InputObject, Clone)]
		pub struct #group_by_ident {
			pub field: #enum_ident,
		}
	};

	Ok(group_by_struct_def)
}

fn generate_enum_def(
	ident: &syn::Ident,
	enum_ident: &syn::Ident,
	fields: &syn::Fields,
	col_map: &HashMap<syn::Ident, GroupingInfo>,
) -> Result<(TokenStream, TokenStream), syn::Error> {
	let variants = get_enum_variants(fields, col_map, ident.span())?;
	if variants.is_empty() {
		return Err(Error::new(
			ident.span(),
			"No fields found to generate enum variants. Add #[groupable] to fields.",
		));
	}

	let column_type = syn::Ident::new("Column", ident.span());

	let enum_def = quote! {
		#[derive(Debug, Clone, Copy, PartialEq, Eq, strum::EnumString, strum::Display, async_graphql::Enum)]
		pub enum #enum_ident {
			#(#variants),*
		}
	};

	let column_impl =
		generate_column_impl(enum_ident, &column_type, fields, col_map, ident.span())?;

	let get_value_impl =
		generate_get_value_impl(enum_ident, fields, col_map, ident.span())?;

	Ok((enum_def, quote! { #column_impl #get_value_impl }))
}

fn generate_column_impl(
	enum_ident: &syn::Ident,
	column_type: &syn::Ident,
	fields: &syn::Fields,
	col_map: &HashMap<syn::Ident, GroupingInfo>,
	span: proc_macro2::Span,
) -> Result<TokenStream, syn::Error> {
	let match_arms = build_column_match_arms(fields, col_map, column_type, span)?;

	let impl_code = quote! {
		impl #enum_ident {
			pub fn to_column(&self) -> #column_type {
				match self {
					#(#match_arms),*
				}
			}
		}
	};

	Ok(impl_code)
}

fn generate_get_value_impl(
	enum_ident: &syn::Ident,
	fields: &syn::Fields,
	col_map: &HashMap<syn::Ident, GroupingInfo>,
	span: proc_macro2::Span,
) -> Result<TokenStream, syn::Error> {
	let match_arms = build_get_value_match_arms(fields, col_map, span)?;

	let impl_code = quote! {
		impl #enum_ident {
			pub fn get_value(&self, book: &Model) -> String {
				match self {
					#(#match_arms),*
				}
			}
		}
	};

	Ok(impl_code)
}

fn build_get_value_match_arms(
	fields: &syn::Fields,
	col_map: &HashMap<syn::Ident, GroupingInfo>,
	span: proc_macro2::Span,
) -> Result<Vec<TokenStream>, syn::Error> {
	let named_fields = match fields {
		syn::Fields::Named(fields_named) => &fields_named.named,
		_ => {
			return Err(Error::new(
				span,
				"Groupable can only be derived for structs with named fields",
			));
		},
	};

	let mut arms = Vec::new();
	for field in named_fields {
		let field_ident = match &field.ident {
			Some(ident) => ident,
			None => continue,
		};

		if is_skip_column(&field.attrs) {
			continue;
		}

		let info = col_map.get(field_ident).ok_or(Error::new(
			field.span(),
			format!("Field {} not found in grouping info map", field_ident),
		))?;

		let variant = &info.column_name;

		let field_type = &field.ty;
		let arm = build_get_value_arm(variant, field_ident, field_type);
		arms.push(arm);
	}

	Ok(arms)
}

fn build_get_value_arm(
	variant: &syn::Ident,
	field_ident: &syn::Ident,
	field_type: &syn::Type,
) -> TokenStream {
	let field_access = quote! { book.#field_ident };
	let type_string = quote! { #field_type }.to_string();

	// Special handling for Option<String> - unwrap directly to get clean string keys
	// Check for "Option" prefix to handle various representations like
	// "Option<String>", "std::option::Option<std::string::String>", etc.
	if type_string.starts_with("Option") && type_string.contains("String") {
		return quote! {
			Self::#variant => #field_access.clone().unwrap_or_default()
		};
	}

	// For other Option types, use match to handle various inner types
	if type_string.starts_with("Option<") {
		let value_expr = quote! {
			match &book.#field_ident {
				Some(v) => format!("{:?}", v),
				None => String::new(),
			}
		};
		return quote! {
			Self::#variant => #value_expr
		};
	}

	// For non-Option types
	if type_string == "String" {
		return quote! {
			Self::#variant => #field_access.clone()
		};
	}

	// For enums and other types, use debug format
	let value_expr = quote! {
		format!("{:?}", #field_access)
	};

	quote! {
		Self::#variant => #value_expr
	}
}

fn build_column_match_arms(
	fields: &syn::Fields,
	col_map: &HashMap<syn::Ident, GroupingInfo>,
	column_type: &syn::Ident,
	span: proc_macro2::Span,
) -> Result<Vec<TokenStream>, syn::Error> {
	let named_fields = match fields {
		syn::Fields::Named(fields_named) => &fields_named.named,
		_ => {
			return Err(Error::new(
				span,
				"Groupable can only be derived for structs with named fields",
			));
		},
	};

	let mut arms = Vec::new();
	for field in named_fields {
		let field_ident = match &field.ident {
			Some(ident) => ident,
			None => continue,
		};

		if is_skip_column(&field.attrs) {
			continue;
		}

		let info = col_map.get(field_ident).ok_or(Error::new(
			field.span(),
			format!("Field {} not found in grouping info map", field_ident),
		))?;

		let variant = &info.column_name;
		let arm = quote! {
			Self::#variant => #column_type::#variant
		};
		arms.push(arm);
	}

	Ok(arms)
}

fn get_ident_name(input: &syn::DeriveInput) -> Result<syn::Ident, syn::Error> {
	if let Ok(graphql_name) = graphql_name(input) {
		if let Some(name) = graphql_name {
			Ok(name)
		} else {
			Ok(input.ident.clone())
		}
	} else {
		Err(Error::new(
			proc_macro2::Span::call_site(),
			"Failed to parse graphql name attribute",
		))
	}
}

fn graphql_name(input: &syn::DeriveInput) -> Result<Option<syn::Ident>, syn::Error> {
	let result = find_attr("graphql", "name", &input.attrs)?;
	if let Some(name) = result {
		let ident = syn::Ident::new(&name, input.ident.span());
		Ok(Some(ident))
	} else {
		Ok(None)
	}
}

fn get_enum_variants(
	data: &syn::Fields,
	col_map: &HashMap<syn::Ident, GroupingInfo>,
	span: proc_macro2::Span,
) -> Result<Vec<syn::Ident>, syn::Error> {
	let fields = match data {
		syn::Fields::Named(fields_named) => &fields_named.named,
		_ => {
			return Err(Error::new(
				span,
				"Groupable can only be derived for structs with named fields",
			));
		},
	};

	let mut variants = Vec::new();
	for field in fields {
		let field_ident = field.ident.clone().ok_or_else(|| {
			Error::new(
				field.span(),
				"Field must have an identifier to be used in grouping",
			)
		})?;

		if is_skip_column(&field.attrs) {
			continue;
		}

		let info = col_map.get(&field_ident).ok_or(Error::new(
			field.span(),
			format!("Field {} not found in grouping info map", field_ident),
		))?;
		variants.push(info.column_name.clone());
	}
	Ok(variants)
}
