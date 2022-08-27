use image::{io::Reader, EncodableLayout};
use std::path::Path;
use webp::{Encoder, WebPMemory};

use crate::types::{alias::ProcessFileResult, errors::ProcessFileError};

pub fn webp_from_path<P: AsRef<Path>>(file_path: P) -> ProcessFileResult<Vec<u8>> {
	let image = Reader::open(file_path.as_ref())?
		.with_guessed_format()?
		.decode()?;

	let encoder: Encoder = Encoder::from_image(&image)
		.map_err(|err| ProcessFileError::WebpEncodeError(err.to_string()))?;

	let encoded_webp: WebPMemory = encoder.encode(65f32);

	Ok(encoded_webp.as_bytes().to_vec())
}

// FIXME: this is **super** slow
pub fn webp_from_bytes(bytes: &[u8]) -> ProcessFileResult<Vec<u8>> {
	let image = image::load_from_memory(bytes)?;

	let encoder: Encoder = Encoder::from_image(&image)
		.map_err(|err| ProcessFileError::WebpEncodeError(err.to_string()))?;

	let encoded_webp: WebPMemory = encoder.encode(5.0);

	Ok(encoded_webp.as_bytes().to_vec())
}

// TODO: tests
#[cfg(test)]
mod tests {}
