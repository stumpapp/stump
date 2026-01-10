use proc_macro2::{Span, TokenStream};
use syn::{DataStruct, Expr, Field, Fields, Ident};

use crate::type_utils;

pub struct StumpConfigVariable {
	pub span: Span,
	pub variable_name: Ident,
	pub variable_type: TokenStream,
	pub is_optional: bool,
	pub is_vec: bool,
	pub attributes: StumpConfigVariableAttributes,
}

pub struct StumpConfigVariableAttributes {
	pub default_value: Option<Expr>,
	pub debug_value: Option<Expr>,
	pub required_by_new: bool,
	pub env_key: Option<Expr>,
	pub validator: Option<Ident>,
}

impl StumpConfigVariable {
	pub fn is_parse_type(&self) -> bool {
		let parse_types = [
			"u8", "u16", "u32", "u64", "i8", "i16", "i32", "i64", "f16", "f32", "f64",
			"usize", "bool",
		];
		let type_str = if self.is_vec {
			self.variable_type
				.to_string()
				.trim_start_matches("Vec<")
				.trim_end_matches('>')
				.to_string()
		} else {
			self.variable_type.to_string()
		};

		parse_types.contains(&type_str.as_str())
	}

	pub fn error<T: std::fmt::Display>(&self, err: T) -> TokenStream {
		syn::Error::new(self.span, err).into_compile_error()
	}
}

/// Parses a struct, extracting a vec representing each of its fields
/// so that they can be represented in the macro's output code.
pub fn get_config_variables(data_struct: &DataStruct) -> Vec<StumpConfigVariable> {
	let mut output_vec = Vec::new();

	if let Fields::Named(fields_named) = &data_struct.fields {
		for field in &fields_named.named {
			// Get the name of the variable as a String
			let variable_name = field.ident.as_ref().unwrap().clone();

			// Parse the field's type info
			let (variable_type, is_optional, is_vec) =
				type_utils::parse_field_type(field);
			// Parse attributes
			let attributes = parse_config_var_attributes(field);

			// Then we add a new variable
			output_vec.push(StumpConfigVariable {
				span: variable_name.span(),
				variable_name,
				variable_type,
				is_optional,
				is_vec,
				attributes,
			});
		}
	}

	output_vec
}

/// Parses the attributes on a config variable, this is where
/// any of the #[attribute] values are unwrapped and stored
fn parse_config_var_attributes(field: &Field) -> StumpConfigVariableAttributes {
	let mut default_value = None;
	let mut debug_value = None;
	let mut required_by_new = false;
	let mut env_key = None;
	let mut validator = None;
	let field_ident = field.ident.as_ref().unwrap();

	for attr in &field.attrs {
		// #[default_value(Expr)]
		if attr.path().is_ident("default_value") {
			let default_value_expr: Expr = attr.parse_args().unwrap_or_else(|e| {
				panic!("Failed to parse default_value expression for {field_ident}: {e}")
			});
			default_value = Some(default_value_expr);
		}

		// #[required_by_new]
		if attr.path().is_ident("required_by_new") {
			required_by_new = true;
		}

		// #[env_key(Expr)]
		if attr.path().is_ident("env_key") {
			let env_key_expr: Expr = attr.parse_args().unwrap_or_else(|e| {
				panic!("Failed to parse env_key expression for {field_ident}: {e}")
			});
			env_key = Some(env_key_expr);
		}

		// #[debug_value(Expr)]
		if attr.path().is_ident("debug_value") {
			let debug_value_expr: Expr = attr.parse_args().unwrap_or_else(|e| {
				panic!("Failed to parse debug_value expression for {field_ident}: {e}")
			});
			debug_value = Some(debug_value_expr);
		}

		// #[validator(fn)]
		if attr.path().is_ident("validator") {
			let validator_ident: Ident = attr.parse_args().unwrap_or_else(|e| {
				panic!("Failed to parse validator identity for {field_ident}: {e}")
			});
			validator = Some(validator_ident);
		}
	}

	StumpConfigVariableAttributes {
		default_value,
		debug_value,
		required_by_new,
		env_key,
		validator,
	}
}
