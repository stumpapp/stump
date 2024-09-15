use data_encoding::HEXLOWER;
use ring::digest::{Context, SHA256};
use std::io;
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

// pub fn generate_from_reader<R: Read>(mut reader: R) -> Result<String, CoreError> {
// 	let mut ring_context = Context::new(&SHA256);

// 	let mut buffer = [0; 1024];

// 	loop {
// 		let count = reader.read(&mut buffer)?;

// 		// This reader has reached its "end of file"
// 		if count == 0 {
// 			break;
// 		}

// 		ring_context.update(&buffer[..count]);
// 	}

// 	let digest = ring_context.finish();

// 	Ok(HEXLOWER.encode(digest.as_ref()))
// }
