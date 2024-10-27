use axum::extract::{multipart::Field, Multipart};
use futures_util::Stream;
use stump_core::filesystem::ContentType;

use crate::errors::{APIError, APIResult};

pub struct FileUploadData {
	pub content_type: ContentType,
	pub bytes: Vec<u8>,
	pub name: String,
}

// TODO: it would be a great enhancement to allow hookup of a malware scanner here, e.g. clamav
/// A helper function to validate and stream the bytes of an image upload from multipart form data, represented
/// by [`Multipart`]. This function will return the content type of the uploaded image if it is valid.
pub async fn validate_and_load_image(
	upload: &mut Multipart,
	max_size: Option<usize>,
) -> APIResult<FileUploadData> {
	validate_and_load_upload(upload, max_size, ContentType::is_image, Some("image")).await
}

/// An internal helper function to validate and load a generic upload.
/// The validator will load an image from multipart form data ([`Multipart`]) and check that it
/// is not larger than the `max_size`. Then, it will check that the `ContentType` information from
/// the header and/or magic numbers in the first 5 bytes of the file match the expected type using
/// the provided `is_valid_content_type` function.
///
/// Optionally, an `expected_type_name` can be provided so that the error message can specify what
/// type was expected.
async fn validate_and_load_upload(
	upload: &mut Multipart,
	max_size: Option<usize>,
	is_valid_content_type: impl Fn(&ContentType) -> bool,
	expected_type_name: Option<&str>,
) -> APIResult<FileUploadData> {
	let field = upload.next_field().await?.ok_or_else(|| {
		APIError::BadRequest(String::from("No file provided in multipart"))
	})?;
	let raw_content_type = field.content_type().map(ContentType::from);

	// Load bytes of uploaded file
	let (name, bytes, file_size) = load_field_up_to_size(field, max_size).await?;

	// Use first 5 bytes to infer content type.
	// See: https://en.wikipedia.org/wiki/List_of_file_signatures
	let magic_bytes = &bytes[..5];
	let inferred_content_type = ContentType::from_bytes(magic_bytes);

	let content_type = match (raw_content_type, inferred_content_type) {
		(Some(provided), inferred)
			if !is_valid_content_type(&provided) && !is_valid_content_type(&inferred) =>
		{
			Err(validation_err(expected_type_name))
		},
		(Some(provided), inferred) => {
			if provided != inferred {
				tracing::warn!(?provided, ?inferred, "Content type mismatch");
			}
			let content_type = if is_valid_content_type(&inferred) {
				inferred
			} else if is_valid_content_type(&provided) {
				provided
			} else {
				return Err(validation_err(expected_type_name));
			};
			Ok(content_type)
		},
		(None, inferred) => {
			if is_valid_content_type(&inferred) {
				Ok(inferred)
			} else {
				Err(validation_err(expected_type_name))
			}
		},
	}?;

	tracing::trace!(?content_type, file_size, "Validated upload");
	Ok(FileUploadData {
		content_type,
		bytes,
		name,
	})
}

/// Load up to `max_size` bytes of a field (erroring if `max_size` is exceeded).
/// Returns the loaded bytes as [Vec<u8>] and the total bytes as [usize].
async fn load_field_up_to_size(
	mut field: Field<'_>,
	max_size: Option<usize>,
) -> APIResult<(String, Vec<u8>, usize)> {
	let name = field.file_name().unwrap_or("unknown filename").to_string();

	// Check size hint if one was provided
	if let (Some(max_size), (_, Some(size_hint))) = (max_size, field.size_hint()) {
		if size_hint > max_size {
			return Err(max_size_err(max_size, &name, size_hint));
		}
	}

	// Load field in chunks
	let mut bytes = Vec::new();
	let mut total_size = 0;
	while let Some(chunk) = field.chunk().await? {
		// Increase chunk size and check against max size (if any)
		total_size += chunk.len();
		if let Some(max_size) = max_size {
			if total_size > max_size {
				return Err(max_size_err(max_size, &name, total_size));
			}
		}

		bytes.extend_from_slice(&chunk);
	}

	if bytes.is_empty() || total_size < 5 {
		return Err(APIError::BadRequest("Uploaded file is empty".to_string()));
	}

	Ok((name, bytes, total_size))
}

/// Formats the validation errors used elsewhere in this module when a type doesn't
/// match the expected type (optionally specified as `expected_type_name`).
fn validation_err(expected_type_name: Option<&str>) -> APIError {
	if let Some(type_name) = expected_type_name {
		if !type_name.is_empty() {
			return APIError::BadRequest(format!(
				"Uploaded file was expected to be {type_name}"
			));
		}
	}

	APIError::BadRequest("Uploaded file does not match expected type".to_string())
}

/// Formats the max size errors used elsewhere in this module when `max_size` is exceeded
/// by a thing named `name` with a value that is `actual_size`.
fn max_size_err(max_size: usize, name: &str, actual_size: usize) -> APIError {
	APIError::BadRequest(format!(
		"Max size of {max_size} bytes exceeded by {name} which is {actual_size} bytes"
	))
}

// TODO: validate_media_upload (books)

#[cfg(test)]
mod tests {
	use super::*;

	#[tokio::test]
	async fn test_max_size_err() {
		max_size_err(500, "file_name", 512);
	}

	#[tokio::test]
	async fn test_validation_err() {
		validation_err(Some("image"));
		validation_err(Some("pdf"));
		validation_err(Some(""));
		validation_err(None);
	}
}
