use std::path::Path;

use globset::GlobSet;
use tokio::task::spawn_blocking;

use crate::fs_utils::PathUtils;

async fn directory_has_media(path: &Path, ignore_rules: &GlobSet) -> bool {
	match tokio::fs::read_dir(path).await {
		Ok(mut dir) => {
			while let Ok(Some(entry)) = dir.next_entry().await {
				let entry_path = entry.path();
				if !entry_path.is_default_ignored() && !ignore_rules.is_match(&entry_path)
				{
					return true;
				}
			}
			false
		},
		Err(e) => {
			tracing::error!(
				error = ?e,
				path = ?path,
				"Failed to read directory"
			);
			false
		},
	}
}

async fn directory_has_media_deep(path: &Path, ignore_rules: &GlobSet) -> bool {
	let ignore_rules = ignore_rules.clone();
	let path = path.to_path_buf();
	let closure_path = path.clone();

	let result = spawn_blocking(move || {
		let path = closure_path.clone();
		let walker = walkdir::WalkDir::new(&path)
			.into_iter()
			.filter_map(Result::ok)
			.filter(|item| item.path() != path);

		for entry in walker {
			let entry_path = entry.path();
			if !entry_path.is_default_ignored() && !ignore_rules.is_match(entry_path) {
				return true;
			}
		}
		false
	})
	.await;

	match result {
		Ok(has_media) => has_media,
		Err(e) => {
			tracing::error!(
				error = ?e,
				path = ?path,
				"Failed to walk directory"
			);
			false
		},
	}
}
