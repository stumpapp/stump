use proc_macro::TokenStream;
use quote::{format_ident, quote};
use syn::{parse_macro_input, DeriveInput};

mod ordering;

#[proc_macro_derive(Ordering, attributes(ordering))]
pub fn ordering(input: proc_macro::TokenStream) -> proc_macro::TokenStream {
	let input = parse_macro_input!(input);
	ordering::ordering_impl(input)
		.unwrap_or_else(|e| e.to_compile_error())
		.into()
}

#[proc_macro_derive(IntoFilter, attributes(field_column, nested_filter))]
pub fn derive_into_filter(input: TokenStream) -> TokenStream {
	let input = parse_macro_input!(input as DeriveInput);
	let name = &input.ident;

	// Generate implementation
	let impl_condition = implement_into_filter(&input);

	// Output the implementation
	TokenStream::from(quote! {
		impl IntoFilter for #name {
			fn into_filter(self) -> sea_orm::Condition {
				#impl_condition
			}
		}
	})
}

fn implement_into_filter(input: &DeriveInput) -> proc_macro2::TokenStream {
	let data_struct = match &input.data {
		syn::Data::Struct(data_struct) => data_struct,
		_ => panic!("Only structs are supported"),
	};

	let fields = match &data_struct.fields {
		syn::Fields::Named(fields) => &fields.named,
		_ => panic!("Only named fields are supported"),
	};

	let mut field_conditions = quote! {};

	for field in fields {
		let field_name = field.ident.as_ref().unwrap();
		let field_type = &field.ty;

		let is_logical_op =
			field_name == "_and" || field_name == "_or" || field_name == "_not";

		let field_condition = if is_logical_op {
			if field_name == "_and" {
				quote! {
					if let Some(filters) = self._and {
						let mut and_condition = sea_orm::Condition::all();
						for filter in filters {
							and_condition = and_condition.add(filter.into_filter());
						}
						condition = condition.add(and_condition);
					}
				}
			} else if field_name == "_or" {
				quote! {
					if let Some(filters) = self._or {
						let mut or_condition = sea_orm::Condition::any();
						for filter in filters {
							or_condition = or_condition.add(filter.into_filter());
						}
						condition = condition.add(or_condition);
					}
				}
			} else {
				quote! {
					if let Some(filters) = self._not {
						let mut not_condition = sea_orm::Condition::any();
						for filter in filters {
							not_condition = not_condition.add(filter.into_filter());
						}
						condition = condition.add(not_condition.not());
					}
				}
			}
		} else if is_nested_type(&field.attrs) {
			quote! {
				if let Some(field_filter) = self.#field_name {
					condition = condition.add(field_filter.into_filter());
				}
			}
		} else {
			let column_path = find_column_path(&field.attrs);

			let string_filter_gen_arm = if is_string_filter_type(field_type) {
				quote! {
					match string_filter {
						StringFilter::Like { like } => {
							condition = condition.add(#column_path.like(format!("%{}%", like)));
						},
						StringFilter::Contains { contains } => {
							condition = condition.add(#column_path.contains(contains));
						},
						StringFilter::Excludes { excludes } => {
							condition = condition.add(#column_path.not_like(format!("%{}%", excludes)));

						},
						StringFilter::StartsWith { starts_with } => {
							condition = condition.add(#column_path.starts_with(starts_with));
						},
						StringFilter::EndsWith { ends_with } => {
							condition = condition.add(#column_path.ends_with(ends_with));
						},
					}
				}
			} else {
				quote! {
					unreachable!("Invalid filter type for field: {}", stringify!(#field_name))
				}
			};

			let numeric_filter_gen_arm = if is_numeric_filter_type(field_type) {
				quote! {
					match numeric_filter {
						NumericFilter::Gt { gt } => {
							condition = condition.add(#column_path.gt(gt));
						},
						NumericFilter::Lt { lt } => {
							condition = condition.add(#column_path.lt(lt));
						},
						NumericFilter::Gte { gte } => {
							condition = condition.add(#column_path.gte(gte));
						},
						NumericFilter::Lte { lte } => {
							condition = condition.add(#column_path.lte(lte));
						},
						NumericFilter::Range(range) => {
							if range.inclusive {
								condition = condition.add(
									#column_path.gte(range.from).and(#column_path.lte(range.to))
								);
							} else {
								condition = condition.add(
									#column_path.gt(range.from).and(#column_path.lt(range.to))
								);
							}
						},
					}
				}
			} else {
				quote! {
					unreachable!("Invalid filter type for field: {}", stringify!(#field_name))
				}
			};

			quote! {
				if let Some(field_filter) = self.#field_name {
					match field_filter {
						FieldFilter::Equals { eq } => {
							condition = condition.add(#column_path.eq(eq));
						},
						FieldFilter::Not { neq } => {
							condition = condition.add(#column_path.ne(neq));
						},
						FieldFilter::Any { any } => {
							condition = condition.add(#column_path.is_in(any.clone()));
						}
						FieldFilter::None { none } => {
							condition = condition.add(#column_path.is_not_in(none.clone()));
						}
						FieldFilter::StringFieldFilter(string_filter) => {
							#string_filter_gen_arm
						}
						FieldFilter::NumericFieldFilter(numeric_filter) => {
							#numeric_filter_gen_arm
						}
						_ => unimplemented!("Filter type not supported"),
					}
				}
			}
		};

		field_conditions = quote! {
			#field_conditions
			#field_condition
		};
	}

	quote! {
		let mut condition = sea_orm::Condition::all();
		#field_conditions
		condition
	}
}

// Extract the inner type from Option<FieldFilter<T>>
fn extract_field_filter_inner_type(ty: &syn::Type) -> Option<String> {
	if let syn::Type::Path(type_path) = ty {
		// Check if it's an Option with FieldFilter (which it always should be)
		if let Some(segment) = type_path.path.segments.first() {
			if segment.ident == "Option" {
				// Extract the type inside Option<...>
				if let syn::PathArguments::AngleBracketed(args) = &segment.arguments {
					if let Some(syn::GenericArgument::Type(syn::Type::Path(inner_path))) =
						args.args.first()
					{
						if let Some(inner_segment) = inner_path.path.segments.first() {
							if inner_segment.ident == "FieldFilter" {
								// Extract the type inside FieldFilter<...>
								if let syn::PathArguments::AngleBracketed(inner_args) =
									&inner_segment.arguments
								{
									if let Some(syn::GenericArgument::Type(
										syn::Type::Path(field_path),
									)) = inner_args.args.first()
									{
										if let Some(field_segment) =
											field_path.path.segments.first()
										{
											return Some(field_segment.ident.to_string());
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}
	None
}

// Check if it's a string filter
fn is_string_filter_type(ty: &syn::Type) -> bool {
	if let Some(inner_type) = extract_field_filter_inner_type(ty) {
		return inner_type == "String" || inner_type == "str";
	}
	false
}

// Check if it's a numeric filter
fn is_numeric_filter_type(ty: &syn::Type) -> bool {
	if let Some(inner_type) = extract_field_filter_inner_type(ty) {
		return matches!(
			inner_type.as_str(),
			"u64"
				| "u32" | "u16"
				| "u8" | "i64"
				| "i32" | "i16"
				| "i8" | "f64"
				| "f32" | "DateTime"
		);
	}
	false
}

// Helper function to detect nested filter types
fn is_nested_type(attrs: &[syn::Attribute]) -> bool {
	for attr in attrs {
		if attr.path().is_ident("nested_filter") {
			return true;
		}
	}

	false
}

// TODO: Don't require this!
/// Extract the `field_column` attribute value
fn find_column_path(attrs: &[syn::Attribute]) -> proc_macro2::TokenStream {
	for attr in attrs {
		if attr.path().is_ident("field_column") {
			if let Ok(value) = attr.parse_args::<syn::LitStr>() {
				let column_path = value.value();
				let parts: Vec<&str> = column_path.split("::").collect();

				let mut tokens = quote! {};
				for part in parts {
					let ident = format_ident!("{}", part);
					tokens = quote! { #tokens::#ident };
				}

				return tokens;
			}
		}
	}

	panic!("Missing field_column attribute for filter field")
}
