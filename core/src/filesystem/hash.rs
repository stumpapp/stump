use data_encoding::HEXLOWER;
use ring::digest::{Context, SHA256};
use std::io::{self, Read, Seek};
use tracing::debug;

// use std::fs::File;
#[cfg(target_family = "unix")]
use std::os::unix::prelude::FileExt;

#[cfg(target_family = "windows")]
use std::os::windows::prelude::*;

pub const HASH_SAMPLE_SIZE: u64 = 10000;
pub const HASH_SAMPLE_COUNT: u64 = 4;

fn read(file: &std::fs::File, offset: u64, size: u64) -> Result<Vec<u8>, io::Error> {
	let mut buffer = vec![0u8; size as usize];

	#[cfg(target_family = "unix")]
	{
		file.read_at(&mut buffer, offset)?;
	}

	#[cfg(target_family = "windows")]
	{
		file.seek_read(&mut buffer, offset)?;
	}

	Ok(buffer)
}

pub fn generate(path: &str, bytes: u64) -> Result<String, io::Error> {
	let file = std::fs::File::open(path)?;

	let mut ring_context = Context::new(&SHA256);

	if bytes <= HASH_SAMPLE_SIZE * HASH_SAMPLE_COUNT {
		let buffer = read(&file, 0, bytes)?;
		ring_context.update(&buffer);
	} else {
		for i in 0..HASH_SAMPLE_COUNT {
			let offset = (bytes / HASH_SAMPLE_COUNT) * i;
			let buffer = read(&file, offset, HASH_SAMPLE_SIZE)?;
			ring_context.update(&buffer);
		}

		let offset = bytes - HASH_SAMPLE_SIZE;
		let buffer = read(&file, offset, HASH_SAMPLE_SIZE)?;

		ring_context.update(&buffer);
	}

	let digest = ring_context.finish();

	let encoded_digest = HEXLOWER.encode(digest.as_ref());

	debug!("Generated checksum: {:?}", encoded_digest);

	Ok(encoded_digest)
}

/// Generate a hash for a file using a port of the Koreader hash algorithm, which is
/// originally written in Lua. The algorithm reads the file in 1KB chunks, starting
/// from the beginning, until it reaches the end of the file or 10 iterations. It isn't
/// overly complex.
///
/// See https://github.com/koreader/koreader/blob/master/frontend/util.lua#L1046-L1072
#[tracing::instrument(fields(path = %path.as_ref().display()))]
pub fn generate_koreader_hash<P: AsRef<std::path::Path>>(
	path: P,
) -> Result<String, io::Error> {
	let mut file = std::fs::File::open(path)?;

	let mut md5_context = md5::Context::new();

	let step = 1024i64;
	let size = 1024i64;

	for i in -1..=10 {
		let offset = if i == -1 { 0 } else { step << (2 * i) };
		file.seek(std::io::SeekFrom::Start(offset as u64))?;

		let mut buffer = vec![0u8; size as usize];
		let bytes_read = file.read(&mut buffer)?;

		// println!("Offset: {}, Bytes Read: {}, i: {i}", offset, bytes_read,);

		if bytes_read == 0 {
			tracing::trace!(?offset, "Reached end of file");
			break;
		}

		md5_context.consume(&buffer);
	}

	let hash = format!("{:x}", md5_context.finalize());
	tracing::debug!(hash = %hash, "Generated hash");

	Ok(hash)
}

#[cfg(test)]
mod tests {
	use std::path::PathBuf;

	use super::*;

	fn epub_path() -> PathBuf {
		PathBuf::from(env!("CARGO_MANIFEST_DIR"))
			.join("integration-tests/data/leaves.epub")
	}

	fn pdf_path() -> PathBuf {
		PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("integration-tests/data/tall.pdf")
	}

	// https://github.com/koreader/koreader/blob/master/spec/unit/util_spec.lua#L339-L341
	#[test]
	fn test_koreader_hash_epub() {
		assert_eq!(
			generate_koreader_hash(epub_path()).unwrap(),
			"59d481d168cca6267322f150c5f6a2a3".to_string()
		)
	}

	// https://github.com/koreader/koreader/blob/master/spec/unit/util_spec.lua#L342-L344
	#[test]
	fn test_koreader_hash_pdf() {
		assert_eq!(
			generate_koreader_hash(pdf_path()).unwrap(),
			"41cce710f34e5ec21315e19c99821415".to_string()
		)
	}
}
