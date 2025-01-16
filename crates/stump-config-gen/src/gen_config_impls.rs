use proc_macro2::TokenStream;
use quote::{format_ident, quote, ToTokens};
use syn::Ident;

use crate::{config_vars::StumpConfigVariable, InputAttributes};

pub fn gen_stump_config_impls(
	struct_ident: &Ident,
	input_attrs: &InputAttributes,
	config_vars: &[StumpConfigVariable],
) -> TokenStream {
	let new_impl = gen_new_impl(config_vars);
	let debug_impl = gen_debug_impl(config_vars);

	let partial_struct_name = format_ident!("Partial{}", struct_ident);
	let with_file_impl = gen_with_file_impl(&partial_struct_name, input_attrs);
	let with_env_impl = gen_with_env_impl(&partial_struct_name, config_vars);

	quote! {
	impl #struct_ident {
	  #new_impl
		#debug_impl

	  #with_file_impl

	  #with_env_impl
		}
	}
}

fn gen_new_impl(config_vars: &[StumpConfigVariable]) -> TokenStream {
	let mut setters: Vec<TokenStream> = Vec::new();
	let mut args: Vec<TokenStream> = Vec::new();

	for var in config_vars {
		let name = &var.variable_name;

		if var.attributes.required_by_new {
			let var_type = &var.variable_type;

			args.push(quote! {#name: #var_type});
			setters.push(quote! {#name: #name});
		} else {
			if var.attributes.default_value.is_none() {
				setters.push(
					var.error(format!("{} needs a default value", var.variable_name)),
				);
				continue;
			}

			let default_expr = var.attributes.default_value.as_ref().unwrap();
			setters.push(quote! {#name: #default_expr});
		}
	}

	quote! {
		pub fn new(#(#args),*) -> Self {
		  Self {
			#(#setters),*
		  }
	  }
	}
}

fn gen_debug_impl(config_vars: &[StumpConfigVariable]) -> TokenStream {
	let mut setters: Vec<TokenStream> = Vec::new();

	for var in config_vars {
		let name = &var.variable_name;

		let setter = match (&var.attributes.debug_value, &var.attributes.default_value) {
			(Some(debug), _) => quote! {#name: #debug},
			(None, Some(default)) => quote! {#name: #default},
			(None, None) => {
				var.error("Must set a default_value or debug_value for each variable")
			},
		};
		setters.push(setter);
	}

	quote! {
		pub fn debug() -> Self {
		  Self {
			#(#setters),*
		  }
	  }
	}
}

fn gen_with_file_impl(
	partial_struct_name: &Ident,
	input_attrs: &InputAttributes,
) -> TokenStream {
	let config_file_loc = &input_attrs.config_file_location;
	quote! {
		#[doc="Looks for the config directory, loading its contents and replacing stored configuration"]
		#[doc="variables with those contents. If the config file doesn't exist, the stored variables"]
		#[doc="remain unchanged and the function returns `Ok`."]
	  pub fn with_config_file(mut self) -> crate::CoreResult<Self> {
			let config_toml = #config_file_loc;

			if !config_toml.exists() {
				return Ok(self);
			}

			let toml_content_str = std::fs::read_to_string(config_toml)?;
			let toml_configs = toml::from_str::<#partial_struct_name>(&toml_content_str)
				.map_err(|e| {
					eprintln!("Failed to parse Stump config file: {}", e);
					crate::CoreError::InitializationError(e.to_string())
				})?;

			toml_configs.apply_to_config(&mut self);
			Ok(self)
	  }
	}
}

fn gen_with_env_impl(
	partial_struct_name: &Ident,
	config_vars: &[StumpConfigVariable],
) -> TokenStream {
	let env_var_extractors = config_vars.iter().map(gen_env_var_extractors);

	quote! {
		#[doc="Loads configuration variables from the environment, replacing stored"]
		#[doc="values with the environment values."]
	  pub fn with_environment(mut self) -> crate::CoreResult<Self> {
		  let mut env_configs = #partial_struct_name::empty();

		  #(#env_var_extractors)*

			env_configs.apply_to_config(&mut self);
			Ok(self)
	  }
	}
}

fn gen_env_var_extractors(var: &StumpConfigVariable) -> TokenStream {
	if let Some(var_env_key) = &var.attributes.env_key {
		let env_key_str = var_env_key.to_token_stream().to_string();
		let var_name = &var.variable_name;
		let var_type = &var.variable_type;

		let is_parse_type = var.is_parse_type();
		// Handle types that need to be parsed from strings
		if is_parse_type && !var.is_vec {
			return quote! {
				if let Ok(#var_name) = env::var(#var_env_key) {
					let parsed_val = #var_name.parse::<#var_type>().map_err(|e| {
						eprintln!("Failed to parse provided {}: {}", #env_key_str, e);
						crate::CoreError::InitializationError(e.to_string())
					})?;
					env_configs.#var_name = Some(parsed_val);
				}
			};
		}

		// Handle types that need to be parsed from String AND into Vec.
		if is_parse_type && var.is_vec {
			return var.error(
				"The config generator macro doesn't implement Vec parsable types.",
			);
		}

		// Handle types that don't need to be parsed, but are Vec
		if !is_parse_type && var.is_vec {
			return quote! {
				if let Ok(#var_name) = env::var(#var_env_key) {
					if !#var_name.is_empty() {
						env_configs.#var_name = Some(
							#var_name
								.split(',')
								.map(|val| val.trim().to_string())
								.collect_vec(),
						)
					}
				}
			};
		}

		// Handle non-Vec non-parse types
		return quote! {
			if let Ok(#var_name) = env::var(#var_env_key) {
				env_configs.#var_name = Some(#var_name);
			}
		};
	}

	// If there isn't an env key we can return an empty set of tokens
	quote! {}
}
