use anyhow::Result;
use data_encoding::HEXLOWER;
use ring::digest::{Context, SHA256};
use rocket::tokio::{
	fs::File,
	io::{self, AsyncReadExt, AsyncSeekExt, SeekFrom},
};
use std::io::Read;

// use std::fs::File;
#[cfg(target_family = "unix")]
use std::os::unix::prelude::FileExt;

#[cfg(target_family = "windows")]
use std::os::windows::prelude::*;

pub const DIGEST_SAMPLE_SIZE: u64 = 10000;
pub const DIGEST_SAMPLE_COUNT: u64 = 4;

async fn read_async(
	file: &mut File,
	offset: u64,
	size: u64,
) -> Result<Vec<u8>, io::Error> {
	let mut buffer = vec![0u8; size as usize];

	// seek to the appropriate offset before reading to buffer
	file.seek(SeekFrom::Start(offset)).await?;
	file.read_exact(&mut buffer).await?;

	Ok(buffer)
}

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

pub async fn digest_async(path: &str, bytes: u64) -> Result<String, io::Error> {
	let mut file = File::open(path).await?;

	let mut ring_context = Context::new(&SHA256);

	if bytes <= DIGEST_SAMPLE_SIZE * DIGEST_SAMPLE_COUNT {
		let buffer = read_async(&mut file, 0, bytes).await?;
		ring_context.update(&buffer);
	} else {
		for i in 0..DIGEST_SAMPLE_COUNT {
			let offset = (bytes / DIGEST_SAMPLE_COUNT) * i;

			let buffer = read_async(&mut file, offset, DIGEST_SAMPLE_SIZE).await?;
			ring_context.update(&buffer);
		}
		let offset = bytes - DIGEST_SAMPLE_SIZE;

		let buffer = read_async(&mut file, offset, DIGEST_SAMPLE_SIZE).await?;

		ring_context.update(&buffer);
	}

	let digest = ring_context.finish();

	let encoded_digest = HEXLOWER.encode(digest.as_ref());

	log::debug!("Generated checksum: {:?}", encoded_digest);

	Ok(encoded_digest)
}

pub fn digest(path: &str, bytes: u64) -> Result<String, io::Error> {
	let file = std::fs::File::open(path).unwrap();

	let mut ring_context = Context::new(&SHA256);

	if bytes <= DIGEST_SAMPLE_SIZE * DIGEST_SAMPLE_COUNT {
		let buffer = read(&file, 0, bytes)?;
		ring_context.update(&buffer);
	} else {
		for i in 0..DIGEST_SAMPLE_COUNT {
			let offset = (bytes / DIGEST_SAMPLE_COUNT) * i;
			let buffer = read(&file, offset, DIGEST_SAMPLE_SIZE)?;
			ring_context.update(&buffer);
		}

		let offset = bytes - DIGEST_SAMPLE_SIZE;
		let buffer = read(&file, offset, DIGEST_SAMPLE_SIZE)?;

		ring_context.update(&buffer);
	}

	let digest = ring_context.finish();

	let encoded_digest = HEXLOWER.encode(digest.as_ref());

	log::debug!("Generated checksum: {:?}", encoded_digest);

	Ok(encoded_digest)
}

pub fn digest_from_reader<R: Read>(mut reader: R) -> Result<String> {
	let mut ring_context = Context::new(&SHA256);

	let mut buffer = [0; 1024];

	loop {
		let count = reader.read(&mut buffer)?;

		// This reader has reached its "end of file"
		if count == 0 {
			break;
		}

		ring_context.update(&buffer[..count]);
	}

	let digest = ring_context.finish();

	Ok(HEXLOWER.encode(digest.as_ref()))
}
