use std::path::PathBuf;

use crate::EmailResult;
use handlebars::Handlebars;

pub fn render_template(
	name: &str,
	data: &serde_json::Value,
	templates_dir: PathBuf,
) -> EmailResult<String> {
	let mut handlebars = Handlebars::new();
	handlebars.register_template_file("base", templates_dir.join("base.hbs"))?;
	handlebars
		.register_template_file("attachment", templates_dir.join("attachment.hbs"))?;
	Ok(handlebars.render_template(name, data)?)
}

// TODO: tests
#[cfg(test)]
mod tests {
	use super::*;

	fn default_templates_dir() -> PathBuf {
		PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("templates")
	}
}
