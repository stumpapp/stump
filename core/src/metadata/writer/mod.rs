use std::path::Path;

use models::entity::{media, tag};
use sea_orm::ConnectionTrait;
use tokio::{sync::oneshot, task::spawn_blocking};

use crate::{
	fs_utils::{FileParts, PathUtils},
	media::processor::MediaProcessorError,
	metadata::spec::comic_info::generate_comic_info,
	CoreError,
};

mod zip;

use zip::write_into_zip;

pub async fn update_embedded_metadata<C>(
	conn: &C,
	book_id: String,
) -> Result<(), CoreError>
where
	C: ConnectionTrait,
{
	let media::ModelWithMetadata { media, metadata } =
		media::ModelWithMetadata::find_by_id(book_id.clone())
			.into_model::<media::ModelWithMetadata>()
			.one(conn)
			.await?
			.ok_or(CoreError::NotFound(format!(
				"Book with ID {book_id} not found"
			)))?;

	let Some(metadata) = metadata else {
		return Err(CoreError::InternalError(
			"This book does not have any existing metadata to writeback".to_string(),
		));
	};

	let book_path = media.path.clone();
	if let Err(e) = tokio::fs::metadata(&book_path).await {
		tracing::error!(error = ?e, "Could not find book on disk");
		return Err(e.into());
	}

	let existing_tags = tag::Entity::find_for_media_id(&media.id)
		.all(conn)
		.await?
		.into_iter()
		.map(|tag| tag.name)
		.collect();

	let metadata_buf = generate_comic_info(&book_path, metadata, existing_tags).await?;

	Ok(write_metadata(book_path, metadata_buf).await?)
}

async fn write_metadata<P: AsRef<Path>>(
	book_path: P,
	metadata_buf: Vec<u8>,
) -> Result<(), MediaProcessorError> {
	let (tx, rx) = oneshot::channel();

	let handle = spawn_blocking({
		let book_path = book_path.as_ref().to_path_buf();

		move || {
			let send_result = tx.send(write_metadata_blocking(book_path, metadata_buf));
			tracing::trace!(
				is_err = send_result.is_err(),
				"Sending result of sync process"
			);
		}
	});

	let result = if let Ok(recv) = rx.await {
		recv?
	} else {
		handle
			.await
			.map_err(|e| MediaProcessorError::Unknown(e.to_string()))?;
		return Err(MediaProcessorError::Unknown(
			"Failed to receive successful metadata write exchange".to_string(),
		));
	};

	Ok(result)
}

fn write_metadata_blocking<P: AsRef<Path>>(
	book_path: P,
	metadata_buf: Vec<u8>,
) -> Result<(), MediaProcessorError> {
	let FileParts { extension, .. } = book_path.as_ref().file_parts();

	match extension.to_lowercase().as_str() {
		"epub" | "zip" | "cbz" => write_into_zip(book_path, metadata_buf),
		ext => Err(MediaProcessorError::UnsupportedFile(format!(
			"File with extension {ext} is not supported for this operation"
		))),
	}
}

#[cfg(test)]
pub(crate) mod tests {
	use std::{fs, path::PathBuf};

	pub fn get_test_zip_path() -> String {
		PathBuf::from(env!("CARGO_MANIFEST_DIR"))
			.join("integration-tests/data/book.zip")
			.to_string_lossy()
			.to_string()
	}

	pub fn get_test_zip_file_data() -> Vec<u8> {
		let test_zip_path = get_test_zip_path();

		fs::read(test_zip_path).expect("Failed to fetch test zip file")
	}
}
