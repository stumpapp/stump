use syn::{Attribute, DataEnum, Ident, Type};

pub(crate) struct EnumVariant {
	//pub span: Span,
	pub variable_name: Ident,
	pub variable_inner_name: Ident,
	pub variable_type: Type,
	pub is_optional: bool,
}

pub(crate) struct DestructedEnum {
	pub variants: Vec<EnumVariant>,
}

pub(crate) fn destructure_enum(enum_data: &DataEnum) -> DestructedEnum {
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
			//span: variant.span(),
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

pub(crate) fn should_filter_type(ty: &Type) -> bool {
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
