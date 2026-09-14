// TODO: Determine if this would be helpful

#[derive(Debug, Clone)]
pub struct ExternalAuthor {
	pub external_id: String,
	pub name: String,
	pub provider_url: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ExternalSeries {
	pub external_id: String,
	pub name: String,
	pub provider_url: Option<String>,
}
