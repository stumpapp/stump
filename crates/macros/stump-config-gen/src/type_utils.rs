use proc_macro2::TokenStream;
use syn::{Field, Type, TypePath};

pub fn parse_field_type(field: &Field) -> (TokenStream, bool, bool) {
	match &field.ty {
		Type::Path(type_path) => {
			let type_name = type_path.path.segments.last().unwrap().ident.to_string();
			let is_optional = type_name == "Option";

			// If it's an Option get the inner type name
			let (type_tokens, is_vec) = if is_optional {
				parse_option_inner_type(type_path)
			}
			// If it's a Vec<T> we want both Vec and T.
			else if type_name == "Vec" {
				let vector_type = get_vector_type(type_path);
				(vector_type, true)
			} else {
				let non_vector_type = type_name.parse::<TokenStream>().unwrap();
				(non_vector_type, false)
			};

			(type_tokens, is_optional, is_vec)
		},
		_ => panic!("Unsupported type"),
	}
}

pub fn parse_option_inner_type(type_path: &TypePath) -> (TokenStream, bool) {
	// Unravel the Option<T>
	match &type_path.path.segments.last().unwrap().arguments {
		// Match on angle bracketed arguments only
		syn::PathArguments::AngleBracketed(args) => {
			// If we have a type T between the angle brackets
			if let Some(syn::GenericArgument::Type(Type::Path(inner_type_path))) =
				args.args.first()
			{
				// Get type T as a String
				let inner_path_name = inner_type_path
					.path
					.segments
					.last()
					.unwrap()
					.ident
					.to_string();

				// If T is a Vec then we need to do more processing
				if inner_path_name == "Vec" {
					let vector_type = get_vector_type(inner_type_path);
					(vector_type, true)
				}
				// Otherwise we can just parse and return it
				else {
					let non_vector_type = inner_path_name.parse::<TokenStream>().unwrap();
					(non_vector_type, false)
				}
			}
			// This shouldn't happen, but would occur if there were empty angle brackets
			else {
				panic!("Failed to unravel Option, are angle brackets empty?");
			}
		},
		// This shouldn't happen either, but would occur if Option had no angle brackets
		_ => panic!("Failed to unravel Option, is there no type for Option<T>?"),
	}
}

pub fn get_vector_type(type_path: &TypePath) -> TokenStream {
	// Unravel the Vec<T>
	match &type_path.path.segments.last().unwrap().arguments {
		// Match on angle bracketed arguments only
		syn::PathArguments::AngleBracketed(args) => {
			// Make sure we have a T between the angle brackets
			if let Some(syn::GenericArgument::Type(Type::Path(inner_type_path))) =
				args.args.first()
			{
				// Get the T as a String
				let inner_path_name = inner_type_path
					.path
					.segments
					.last()
					.unwrap()
					.ident
					.to_string();

				// Output the full type name, by inserting the T name into Vec
				format!("Vec<{inner_path_name}>")
					.parse::<TokenStream>()
					.unwrap()
			}
			// This shouldn't happen, but would occur if the angle brackets were empty
			else {
				panic!("Failed to unravel Vec, are angle brackets empty?")
			}
		},
		// This shouldn't happen either, but would occur if Vec had no type T
		_ => panic!("Failed to unravel Vec, is there no type for Vec<T>?"),
	}
}
