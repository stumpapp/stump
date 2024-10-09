use proc_macro2::TokenStream;
use quote::{format_ident, quote};
use syn::Ident;

use crate::config_vars::StumpConfigVariable;

pub fn gen_partial_stump_config(
	struct_ident: &Ident,
	config_vars: &[StumpConfigVariable],
) -> proc_macro2::TokenStream {
	let mut struct_defs = Vec::new();
	let mut empty_setters = Vec::new();

	for var in config_vars {
		let name = &var.variable_name;
		let type_name = &var.variable_type;

		struct_defs.push(quote! {pub #name: Option<#type_name>});
		empty_setters.push(quote! {#name: None});
	}

	let empty_fn_impl = gen_empty_impl(&empty_setters);
	let apply_fn_impl = gen_apply_impl(struct_ident, config_vars);
	let partial_struct_name = format_ident!("Partial{}", struct_ident);

	quote! {
		#[derive(serde::Deserialize, Debug, Clone, PartialEq)]
		struct #partial_struct_name {
			#(#struct_defs),*
		}

	impl #partial_struct_name {
	  #empty_fn_impl
	  #apply_fn_impl
	}
	}
}

fn gen_empty_impl(empty_setters: &[TokenStream]) -> TokenStream {
	quote! {
	  pub fn empty() -> Self {
	  Self {
		#(#empty_setters),*
	  }
	  }
	}
}

fn gen_apply_impl(
	struct_ident: &Ident,
	config_vars: &[StumpConfigVariable],
) -> TokenStream {
	// Generate the setters for each config var
	let apply_setters = config_vars.iter().map(config_var_to_setter);

	// Output the final function implementation
	quote! {
	  pub fn apply_to_config(self, config: &mut #struct_ident) {
		  #(#apply_setters)*
	  }
	}
}

fn config_var_to_setter(var: &StumpConfigVariable) -> TokenStream {
	let var_name = &var.variable_name;

	let setter = match (var.is_vec, var.is_optional) {
		(true, true) => {
			var.error("The config macro doesn't support Option<Vec<T>> config variables.")
		},
		(true, false) => {
			let orig_var_name = format_ident!("orig_{}", var_name);

			quote! {
			let #orig_var_name = config.#var_name.clone();
			config
			.#var_name
			.extend(#var_name.into_iter().filter(|x| !#orig_var_name.contains(x)));
			}
		},
		(false, true) => quote! {
		  config.#var_name = Some(#var_name);
		},
		(false, false) => quote! {
		  config.#var_name = #var_name;
		},
	};

	// This portion wraps the variable-specific setter in a check for Some() in the partial config
	// and, if there is a validator set, only applies the variable if it passes, and then returns.
	var.attributes.validator.as_ref().map_or_else(
		|| {
			quote! {
				if let Some(#var_name) = self.#var_name {
				  #setter
				}
			}
		},
		|validator| {
			quote! {
				if let Some(#var_name) = self.#var_name {
					if #validator(&#var_name) {
						#setter
					}
				}
			}
		},
	)
}
