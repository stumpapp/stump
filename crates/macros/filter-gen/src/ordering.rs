use heck::ToUpperCamelCase;
use proc_macro2::TokenStream;
use quote::quote;
use std::collections::HashMap;
use syn::{parse2, spanned::Spanned, Error};

/// This macro generates an enum with a variant where every variant is a name of the field of the
/// struct.
/// Example:
/// ```
/// struct Foo {
///    a: i32,
///    b: String,
/// }
/// ```
/// would generate the following enum:
///```
/// enum FooOrdering {
///   A,
///   B,
///}
///```
///
pub fn ordering_impl(input: TokenStream) -> Result<TokenStream, syn::Error> {
	let span = input.span();
	let input = parse2::<syn::DeriveInput>(input)
		.map_err(|e| Error::new(span, format!("Failed to parse input: {}", e)))?;

	let col_map = build_field_to_sea_orm_col_map(&input)?;

	// get the name of the struct (use graphql name if present)
	let ident = get_ident_name(&input, span)?;

	let data = match input.data {
		syn::Data::Struct(data) => data,
		_ => return Err(Error::new(span, "Ordering can only be derived for structs")),
	};

	// generates the enum definition
	let enum_ident = syn::Ident::new(&format!("{}Ordering", ident), ident.span());
	let enum_def = generate_enum_def(&ident, &enum_ident, &data.fields, &col_map)?;

	// generates the input objects for the order bys
	let order_by_ident = syn::Ident::new(&format!("{}OrderBy", ident), ident.span());
	let order_by_structs_def =
		generate_order_by_structs_def(&order_by_ident, &enum_ident)?;

	// generates the impl that converts from graphql to sea_orm order bys
	let order_by_impl = generate_order_by_impl(&order_by_ident, &enum_ident, &col_map)?;

	// build the final output
	let output = quote! {
		#enum_def

		#order_by_structs_def

		#order_by_impl
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
					// Reads the value expression to advance the parse stream.
					// Some parameters, such as `primary_key`, do not have any value,
					// so ignoring an error occurred here.
					let _: Option<syn::Expr> = meta.value().and_then(|v| v.parse()).ok();
				}

				Ok(())
			})
		})?;
	Ok(name)
}

const RAW_IDENTIFIER: &str = "r#";

fn is_skip_column(attrs: &[syn::Attribute]) -> bool {
	attrs
		.iter()
		.filter(|attr| attr.path().is_ident("ordering"))
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

fn build_field_to_sea_orm_col_map(
	input: &syn::DeriveInput,
) -> Result<HashMap<syn::Ident, syn::Ident>, syn::Error> {
	let mut field_to_sea_orm_col_map = HashMap::new();

	if let syn::Data::Struct(item_struct) = &input.data {
		if let syn::Fields::Named(fields) = &item_struct.fields {
			for field in &fields.named {
				if let Some(ident) = &field.ident {
					// Skip fields with the `ordering(skip)` attribute
					if is_skip_column(&field.attrs) {
						continue;
					}

					let enum_name = find_attr("sea_orm", "enum_name", &field.attrs)?;
					let sea_orm_field_ident = if let Some(enum_name) = enum_name {
						enum_name
					} else {
						ident
							.to_string()
							.trim_start_matches(RAW_IDENTIFIER)
							.to_string()
							.to_upper_camel_case()
					};

					let sea_orm_field_ident =
						syn::Ident::new(&sea_orm_field_ident, ident.span());
					field_to_sea_orm_col_map.insert(ident.clone(), sea_orm_field_ident);
				}
			}
		}
	}

	Ok(field_to_sea_orm_col_map)
}

fn generate_order_by_impl(
	order_by_ident: &syn::Ident,
	enum_ident: &syn::Ident,
	col_map: &HashMap<syn::Ident, syn::Ident>,
) -> Result<TokenStream, syn::Error> {
	let mut enum_map: syn::punctuated::Punctuated<_, syn::token::Comma> =
		syn::punctuated::Punctuated::new();

	// our enums match the naming of sea_orm enums, so we can just use the same name
	// sort to keep the order consistent
	let mut values: Vec<syn::Ident> = col_map.values().cloned().collect::<Vec<_>>();
	values.sort();
	for value in values {
		enum_map.push(quote! {
			#enum_ident::#value => Column::#value
		});
	}

	let order_by_impl = quote! {
		impl OrderBy<Entity, #order_by_ident> for #order_by_ident {
			fn add_order_by(
				order_by: &[#order_by_ident],
				query: sea_orm::Select<Entity>,
			) -> Result<sea_orm::Select<Entity>, sea_orm::ColumnFromStrErr> {
				if order_by.is_empty() {
					return Ok(query);
				}

				order_by
					.iter()
					.try_fold(query, |query, order_by|  {
						let order = sea_orm::Order::from(order_by.direction);
						let field = match order_by.field {
							#enum_map
						};
						Ok(query.order_by(field, order))
					})
			}
		}
	};

	Ok(order_by_impl)
}

fn generate_order_by_structs_def(
	order_by_ident: &syn::Ident,
	enum_ident: &syn::Ident,
) -> Result<TokenStream, syn::Error> {
	let order_by_structs_def = quote! {
		#[derive(async_graphql::InputObject, Clone)]
		pub struct #order_by_ident {
			pub field: #enum_ident,
			pub direction: OrderDirection,
		}
	};

	Ok(order_by_structs_def)
}

fn generate_enum_def(
	ident: &syn::Ident,
	enum_ident: &syn::Ident,
	fields: &syn::Fields,
	col_map: &HashMap<syn::Ident, syn::Ident>,
) -> Result<TokenStream, syn::Error> {
	// generate the enum variants
	let enum_variants = get_enum_variants(fields, col_map, ident.span())?;
	if enum_variants.is_empty() {
		return Err(Error::new(
			ident.span(),
			"No fields found to generate enum variants",
		));
	}

	let enum_def = quote! {
		#[derive(Debug, Clone, Copy, PartialEq, Eq, strum::EnumString, strum::Display, async_graphql::Enum)]
		pub enum #enum_ident {
			#(#enum_variants),*
		}
	};
	Ok(enum_def)
}

fn get_ident_name(
	input: &syn::DeriveInput,
	span: proc_macro2::Span,
) -> Result<syn::Ident, syn::Error> {
	if let Ok(graphql_name) = graphql_name(input) {
		if let Some(name) = graphql_name {
			Ok(name)
		} else {
			Ok(input.ident.clone())
		}
	} else {
		Err(Error::new(span, "Failed to parse graphql name attribute"))
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
	col_map: &HashMap<syn::Ident, syn::Ident>,
	span: proc_macro2::Span,
) -> Result<Vec<syn::Ident>, syn::Error> {
	let fields = match data {
		syn::Fields::Named(fields_named) => &fields_named.named,
		_ => {
			return Err(Error::new(
				span,
				"Ordering can only be derived for structs with named fields",
			));
		},
	};

	let mut variants = Vec::new();
	for field in fields {
		let field_ident = field.ident.clone().ok_or_else(|| {
			Error::new(
				field.span(),
				"Field must have an identifier to be used in ordering",
			)
		})?;

		// Skip fields with the `ordering(skip)` attribute
		if is_skip_column(&field.attrs) {
			continue;
		}

		let variant_ident = col_map.get(&field_ident).ok_or(Error::new(
			field.span(),
			format!("Field {} not found in sea_orm column map", field_ident),
		))?;
		variants.push(variant_ident.clone());
	}
	Ok(variants)
}

#[cfg(test)]
mod tests {
	use super::*;
	use quote::quote;

	fn str_to_ident(s: &str) -> syn::Ident {
		syn::Ident::new(s, proc_macro2::Span::call_site())
	}

	#[test]
	fn test_skip() {
		let input = quote! {
			struct Foo {
				#[ordering(skip)]
				a: i32,
				b: String,
			}
		};

		let input = parse2::<syn::DeriveInput>(input).unwrap();

		let col_map = build_field_to_sea_orm_col_map(&input).unwrap();
		assert_eq!(col_map.len(), 1);
		assert_eq!(*col_map.get(&str_to_ident("b")).unwrap(), str_to_ident("B"));

		let fields = match input.data {
			syn::Data::Struct(data) => data.fields,
			_ => panic!("Expected a struct"),
		};

		let enum_def = generate_enum_def(
			&str_to_ident("Foo"),
			&str_to_ident("FooOrdering"),
			&fields,
			&col_map,
		)
		.unwrap();

		let enum_def_expected = quote! {
			#[derive(Debug, Clone, Copy, PartialEq, Eq, strum::EnumString, strum::Display, async_graphql::Enum)]
			pub enum FooOrdering {
				B
			}
		};
		assert_eq!(enum_def.to_string(), enum_def_expected.to_string());
	}

	#[test]
	fn test_find_attr() {
		let input = quote! {
			struct Foo {
				#[sea_orm(enum_name = "Test")]
				a: i32,
				#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
				b: String,
			}
		};

		let input = parse2::<syn::DeriveInput>(input).unwrap();
		let fields = match input.data {
			syn::Data::Struct(data) => data.fields,
			_ => panic!("Expected a struct"),
		};

		let fields = match fields {
			syn::Fields::Named(fields_named) => &fields_named.named.clone(),
			_ => panic!("Expected named fields"),
		};

		let attrs0 = fields.iter().next().unwrap().attrs.clone();
		let attrs1 = fields.iter().nth(1).unwrap().attrs.clone();

		let attr = find_attr("sea_orm", "enum_name", &attrs0).unwrap();
		assert_eq!(attr, Some("Test".to_string()));
		let attr = find_attr("sea_orm", "enum_name", &attrs1).unwrap();
		assert_eq!(attr, None);
	}

	#[test]
	fn build_col_map_enum_name() {
		let input = quote! {
			#[graphql(name = "FooGraphQL")]
			struct Foo {
				#[sea_orm(enum_name = "Test")]
				a: i32,
				#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
				b: String,
			}
		};

		let input = parse2::<syn::DeriveInput>(input).unwrap();
		let col_map = build_field_to_sea_orm_col_map(&input).unwrap();
		assert_eq!(col_map.len(), 2);
		assert_eq!(
			*col_map.get(&str_to_ident("a")).unwrap(),
			str_to_ident("Test")
		);
		assert_eq!(*col_map.get(&str_to_ident("b")).unwrap(), str_to_ident("B"));
	}

	#[test]
	fn build_col_map() {
		let input = quote! {
			#[graphql(name = "FooGraphQL")]
			struct Foo {
				a: i32,
				b: String,
			}
		};

		let input = parse2::<syn::DeriveInput>(input).unwrap();
		let col_map = build_field_to_sea_orm_col_map(&input).unwrap();
		assert_eq!(col_map.len(), 2);
		assert_eq!(*col_map.get(&str_to_ident("a")).unwrap(), str_to_ident("A"));
		assert_eq!(*col_map.get(&str_to_ident("b")).unwrap(), str_to_ident("B"));
	}

	#[test]
	fn test_get_enum_def_empty() {
		let input = quote! {
			struct Foo {
			}
		};

		let input = parse2::<syn::DeriveInput>(input).unwrap();
		let col_map = HashMap::new();
		let data = match input.data {
			syn::Data::Struct(data) => data,
			_ => panic!("Expected a struct"),
		};

		let ident = syn::Ident::new("Foo", proc_macro2::Span::call_site());
		let enum_ident = syn::Ident::new("FooOrdering", proc_macro2::Span::call_site());
		let result = generate_enum_def(&ident, &enum_ident, &data.fields, &col_map);
		assert!(result.is_err());
	}

	#[test]
	fn test_get_enum_def() {
		let input = quote! {
			#[graphql(name = "FooGraphQL")]
			struct Foo {
				a: i32,
				b: String,
			}
		};

		let input = parse2::<syn::DeriveInput>(input).unwrap();
		let col_map = HashMap::from([
			(
				syn::Ident::new("a", proc_macro2::Span::call_site()),
				syn::Ident::new("A", proc_macro2::Span::call_site()),
			),
			(
				syn::Ident::new("b", proc_macro2::Span::call_site()),
				syn::Ident::new("B", proc_macro2::Span::call_site()),
			),
		]);
		let data = match input.data {
			syn::Data::Struct(data) => data,
			_ => panic!("Expected a struct"),
		};

		let ident = syn::Ident::new("Foo", proc_macro2::Span::call_site());
		let enum_ident = syn::Ident::new("FooOrdering", proc_macro2::Span::call_site());
		let result =
			generate_enum_def(&ident, &enum_ident, &data.fields, &col_map).unwrap();
		let expected_output = quote! {
			#[derive(Debug, Clone, Copy, PartialEq, Eq, strum::EnumString, strum::Display, async_graphql::Enum)]
			pub enum FooOrdering {
				A,
				B
			}
		};
		assert_eq!(result.to_string(), expected_output.to_string());
	}

	#[test]
	fn test_get_enum_variants_empty() {
		let input = quote! {
			struct Foo {
			}
		};

		let input = parse2::<syn::DeriveInput>(input).unwrap();
		let col_map = HashMap::new();
		let data = match input.data {
			syn::Data::Struct(data) => data,
			_ => panic!("Expected a struct"),
		};

		let result =
			get_enum_variants(&data.fields, &col_map, proc_macro2::Span::call_site())
				.unwrap();
		assert_eq!(result.len(), 0);
	}

	#[test]
	fn test_get_enum_variants() {
		let input = quote! {
			#[graphql(name = "FooGraphQL")]
			struct Foo {
				a: i32,
				b: String,
			}
		};

		let input = parse2::<syn::DeriveInput>(input).unwrap();
		let col_map = HashMap::from([
			(
				syn::Ident::new("a", proc_macro2::Span::call_site()),
				syn::Ident::new("A", proc_macro2::Span::call_site()),
			),
			(
				syn::Ident::new("b", proc_macro2::Span::call_site()),
				syn::Ident::new("B", proc_macro2::Span::call_site()),
			),
		]);
		let data = match input.data {
			syn::Data::Struct(data) => data,
			_ => panic!("Expected a struct"),
		};

		let result =
			get_enum_variants(&data.fields, &col_map, proc_macro2::Span::call_site())
				.unwrap();
		assert_eq!(result.len(), 2);
		assert_eq!(
			result[0].to_string(),
			syn::Ident::new("A", proc_macro2::Span::call_site()).to_string()
		);
		assert_eq!(
			result[1].to_string(),
			syn::Ident::new("B", proc_macro2::Span::call_site()).to_string()
		);
	}

	#[test]
	fn test_get_ident_name() {
		let input = quote! {
			#[graphql(name = "FooGraphQL")]
			struct Foo {
				a: i32,
				b: String,
			}
		};

		let expected_output = quote! {
			FooGraphQL
		};

		let result = get_ident_name(
			&parse2::<syn::DeriveInput>(input.clone()).unwrap(),
			input.span(),
		)
		.unwrap();
		assert_eq!(result.to_string(), expected_output.to_string());
	}

	#[test]
	fn test_get_ident_no_name() {
		let input = quote! {
			struct Foo {
				a: i32,
				b: String,
			}
		};

		let expected_output = quote! {
			Foo
		};

		let result = get_ident_name(
			&parse2::<syn::DeriveInput>(input.clone()).unwrap(),
			input.span(),
		)
		.unwrap();
		assert_eq!(result.to_string(), expected_output.to_string());
	}

	#[test]
	fn test_get_ident_malformed() {
		let input = quote! {
			#[graphql(name = )]
			struct Foo {
				a: i32,
			}
		};

		let result = get_ident_name(
			&parse2::<syn::DeriveInput>(input.clone()).unwrap(),
			input.span(),
		);
		assert!(result.is_err());
	}

	#[test]
	fn test_graphql_name() {
		let input = quote! {
			#[graphql(name = "FooGraphQL")]
			struct Foo {
				a: i32,
				b: String,
			}
		};

		let expected_output = quote! {
			FooGraphQL
		};

		let result = graphql_name(&parse2::<syn::DeriveInput>(input).unwrap()).unwrap();
		assert_eq!(result.unwrap().to_string(), expected_output.to_string());
	}

	#[test]
	fn test_graphql_no_name() {
		let input = quote! {
			struct Foo {
				a: i32,
				b: String,
			}
		};

		let result = graphql_name(&parse2::<syn::DeriveInput>(input).unwrap()).unwrap();
		assert_eq!(result, None);
	}

	#[test]
	fn test_ordering_impl() {
		let input = quote! {
			struct Foo {
				a: i32,
				b: String,
			}
		};

		let expected_output = quote! {
			#[derive(
				Debug, Clone, Copy, PartialEq, Eq, strum::EnumString, strum::Display, async_graphql::Enum
			)]
			pub enum FooOrdering {
				A,
				B
			}
			#[derive(async_graphql::InputObject, Clone)]
			pub struct FooOrderBy {
				pub field: FooOrdering,
				pub direction: OrderDirection,
			}
			impl OrderBy<Entity, FooOrderBy> for FooOrderBy {
				fn add_order_by(
					order_by: &[FooOrderBy],
					query: sea_orm::Select<Entity>,
				) -> Result<sea_orm::Select<Entity>, sea_orm::ColumnFromStrErr> {
					if order_by.is_empty() {
						return Ok(query);
					}
					order_by.iter().try_fold(query, |query, order_by| {
						let order = sea_orm::Order::from(order_by.direction);
						let field = match order_by.field {
							FooOrdering::A => Column::A,
							FooOrdering::B => Column::B
						};
						Ok(query.order_by(field, order))
					})
				}
			}
		};

		let result = ordering_impl(input).unwrap();
		let result_str = result.to_string();
		assert_eq!(result_str, expected_output.to_string());
	}

	#[test]
	fn test_ordering_impl_graphql_name() {
		let input = quote! {
			#[graphql(name = "FooGraphQL")]
			struct Foo {
				a: i32,
				b: String,
			}
		};

		let expected_output = quote! {
			#[derive(
				Debug, Clone, Copy, PartialEq, Eq, strum::EnumString, strum::Display, async_graphql::Enum
			)]
			pub enum FooGraphQLOrdering {
				A,
				B
			}
			#[derive(async_graphql::InputObject, Clone)]
			pub struct FooGraphQLOrderBy {
				pub field: FooGraphQLOrdering,
				pub direction: OrderDirection,
			}
			impl OrderBy<Entity, FooGraphQLOrderBy> for FooGraphQLOrderBy {
				fn add_order_by(
					order_by: &[FooGraphQLOrderBy],
					query: sea_orm::Select<Entity>,
				) -> Result<sea_orm::Select<Entity>, sea_orm::ColumnFromStrErr> {
					if order_by.is_empty() {
						return Ok(query);
					}
					order_by.iter().try_fold(query, |query, order_by| {
						let order = sea_orm::Order::from(order_by.direction);
						let field = match order_by.field {
							FooGraphQLOrdering::A => Column::A,
							FooGraphQLOrdering::B => Column::B
						};
						Ok(query.order_by(field, order))
					})
				}
			}
		};

		let result = ordering_impl(input).unwrap();
		let result_str = result.to_string();
		assert_eq!(result_str, expected_output.to_string());
	}
}
