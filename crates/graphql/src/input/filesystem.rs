use async_graphql::InputObject;

fn default_true() -> bool {
	true
}

#[derive(Debug, Clone, InputObject)]
pub struct DirectoryListingInput {
	pub path: Option<String>,
	#[graphql(flatten, default)]
	pub ignore_params: DirectoryListingIgnoreParams,
}

#[derive(Debug, Clone, InputObject)]
pub struct DirectoryListingIgnoreParams {
	#[graphql(default_with = "default_true()")]
	pub ignore_hidden: bool,
	#[graphql(default)]
	pub ignore_files: bool,
	#[graphql(default)]
	pub ignore_directories: bool,
}

impl Default for DirectoryListingIgnoreParams {
	fn default() -> Self {
		Self {
			ignore_hidden: true,
			ignore_files: false,
			ignore_directories: false,
		}
	}
}

impl Default for DirectoryListingInput {
	fn default() -> Self {
		Self {
			path: Some("/".to_string()),
			ignore_params: DirectoryListingIgnoreParams::default(),
		}
	}
}
