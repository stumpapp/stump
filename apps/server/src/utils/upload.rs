use axum::extract::Multipart;
use stump_core::filesystem::ContentType;

use crate::errors::{ApiError, ApiResult};

// TODO: it would be a great enhancement to allow hookup of a malware scanner here, e.g. clamav
// TODO: Allow configuration of maximum file size
/// A helper function to validate an image upload. This function will return the content type of the
/// uploaded image if it is valid.
pub async fn validate_image_upload(
	upload: &mut Multipart,
) -> ApiResult<(ContentType, Vec<u8>)> {
	let field = upload.next_field().await?.ok_or_else(|| {
		ApiError::BadRequest(String::from("No file provided in multipart"))
	})?;

	let raw_content_type = field.content_type().map(ContentType::from);

	let bytes = field.bytes().await?;
	let file_size = bytes.len();

	if bytes.is_empty() || bytes.len() < 5 {
		return Err(ApiError::BadRequest("Uploaded file is empty".to_string()));
	}

	let mut magic_bytes = vec![0; 5];
	magic_bytes.copy_from_slice(&bytes[..5]);

	let inferred_content_type = ContentType::from_bytes(&magic_bytes);

	let content_type = match (raw_content_type, inferred_content_type) {
		(Some(provided), inferred) if !provided.is_image() && !inferred.is_image() => {
			Err(ApiError::BadRequest(
				"Uploaded file is not an image".to_string(),
			))
		},
		(Some(provided), inferred) => {
			if provided != inferred {
				tracing::warn!(?provided, ?inferred, "Content type mismatch");
			}
			let content_type = (inferred.is_image())
				.then_some(inferred)
				.or_else(|| provided.is_image().then_some(provided))
				.ok_or_else(|| {
					ApiError::BadRequest("Uploaded file is not an image".to_string())
				})?;
			Ok(content_type)
		},
		(None, inferred) => (inferred.is_image()).then_some(inferred).ok_or_else(|| {
			ApiError::BadRequest("Uploaded file is not an image".to_string())
		}),
	}?;

	tracing::trace!(?content_type, file_size, "Validated image upload");

	Ok((content_type, bytes.to_vec()))
}

// TODO: validate_media_upload (books)
