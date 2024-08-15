mod config_vars;
mod gen_config_impls;
mod gen_partial_config;
mod type_utils;

use quote::quote;
use syn::{parse_macro_input, Data, DeriveInput, Expr};

use gen_config_impls::gen_stump_config_impls;
use gen_partial_config::gen_partial_stump_config;

#[proc_macro_derive(
	StumpConfigGenerator,
	attributes(
		default_value,
		debug_value,
		required_by_new,
		env_key,
		validator,
		config_file_location
	)
)]
pub fn derive(input: proc_macro::TokenStream) -> proc_macro::TokenStream {
	let ast = parse_macro_input!(input as DeriveInput);
	let input_attrs = parse_input_attrs(&ast);

	// Make sure it's a struct and unwrap it
	if let Data::Struct(data_struct) = &ast.data {
		let struct_ident = &ast.ident;
		let config_vars = config_vars::get_config_variables(data_struct);

		let generated_partial_config =
			gen_partial_stump_config(struct_ident, &config_vars);

		let generated_config_impls =
			gen_stump_config_impls(struct_ident, &input_attrs, &config_vars);

		let tokens = quote! {
			#generated_partial_config

			#generated_config_impls
		};

		tokens.into()
	} else {
		panic!("Can only generate a config from a struct");
	}
}

struct InputAttributes {
	pub config_file_location: Expr,
}

fn parse_input_attrs(ast: &DeriveInput) -> InputAttributes {
	let mut maybe_config_file_location = None;

	for attr in &ast.attrs {
		if attr.path().is_ident("config_file_location") {
			let config_file_expr: Expr = attr
				.parse_args()
				.expect("Failed to parse config_file_location expression");
			maybe_config_file_location = Some(config_file_expr);
		}
	}

	let config_file_location =
		maybe_config_file_location.expect("config_file_location must be defined.");
	InputAttributes {
		config_file_location,
	}
}
