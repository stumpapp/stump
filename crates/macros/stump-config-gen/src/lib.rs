mod config_vars;
mod gen_config_impls;
mod gen_partial_config;
mod type_utils;

use quote::quote;
use syn::{parse_macro_input, Data, DeriveInput, Expr};

use gen_config_impls::gen_stump_config_impls;
use gen_partial_config::gen_partial_stump_config;

/// A procedural macro for generating the internals of the configuration struct
/// used in Stump.
///
/// This macro generates four main functions for the struct that it is applied to:
/// `new`, `debug`, `with_config_file`, and `with_environment`. Each member of the
/// struct should be annotated to indicate how each should be determined. The
/// following section explains each available annotation.
///
/// ### `#[default_value(Expr)]`
///
/// This attribute is applied to a field of the input struct to define a default value
/// for the variable. Whichever expression is provided will be used in the `new(...)`
/// function to set the value of the output. This value must be set unless you use the
/// `required_by_new` attribute (described below).
///
/// ### `#[debug_value(Expr)]`
///
/// This attribute is applied to a field of the input struct to indicate what its value
/// should be when constructing the `debug()` output. If no `debug_value` is set, the
/// `default_value` is used instead. Each field *must* have at least one of `debug_value`
/// or `default_value` set.
///
/// ### `#[required_by_new]`
///
/// This attribute indicates that a field of the input will be a required parameter of the
/// `new` function constructed by the macro. Using `required_by_new` will override any
/// `default_value` set, using the `new` function parameter's value instead.
///
/// ### `#[env_key(Expr)]`
///
/// This attribute indicates the environment variable from which the field it is applied to
/// is derived using the `with_environment` function. Inputs can be a `str` value or `const`
/// (or, indeed, any expression). Variables without this annotation will not be included in
/// the `with_environment` function at all.
///
/// ### `#[validator(Fn)]`
///
/// This attribute optionally allows a validation function to be defined which will run before  
/// any value of type `T` is written to the struct when running `with_environment` or
/// `with_config_file`. The function must have the signature `Fn(T) -> bool`, with a `true`
/// result causing the variable to be written, and a `false` result causing it not to be written.
///
/// ### `#[config_file_location(Expr)]`
///
/// This attribute should be applied directly to the input struct (i.e., below the `derive` line)
/// and provides an expression that can be used to determine the config file path that should be
/// opened when the `with_config_file` function runs. Any expression works here, including a
/// reference to a private function of the input struct.
///
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
