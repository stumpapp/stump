use std::path::PathBuf;

use crate::EmailResult;
use handlebars::Handlebars;

pub enum Template {
	Attachment,
}

impl AsRef<str> for Template {
	fn as_ref(&self) -> &str {
		match self {
			Self::Attachment => "attachment",
		}
	}
}

pub fn render_template(
	template: Template,
	data: &serde_json::Value,
	templates_dir: PathBuf,
) -> EmailResult<String> {
	let mut handlebars = Handlebars::new();
	handlebars.register_partial("base_partial", "{{> base}}")?;
	handlebars.register_template_file("base", templates_dir.join("base.hbs"))?;
	handlebars
		.register_template_file("attachment", templates_dir.join("attachment.hbs"))?;

	Ok(handlebars.render(template.as_ref(), data)?)
}

// TODO: tests
#[cfg(test)]
mod tests {
	use super::*;

	fn default_templates_dir() -> PathBuf {
		PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("templates")
	}

	#[test]
	fn render_template_attachment() {
		let data = serde_json::json!({
			"title": "Stump Attachment",
		});

		let rendered =
			render_template(Template::Attachment, &data, default_templates_dir())
				.unwrap();

		println!("{}", rendered);
	}
}
