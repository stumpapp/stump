use anyhow::Result;
use data_encoding::HEXLOWER;
use ring::digest::{Context, SHA256};
use std::io::Read;

use std::fs::File;
#[cfg(target_family = "unix")]
use std::os::unix::prelude::FileExt;

#[cfg(target_family = "windows")]
use std::os::windows::prelude::*;

pub fn digest(path: &str, byte_offset: u64) -> Result<String> {
	let file = File::open(path).unwrap();

	let mut ring_context = Context::new(&SHA256);

	// set the buffer according to the byte_offset, as we will
	// read 0-byte_offset bytes
	let mut buffer = vec![0u8; byte_offset as usize];

	#[cfg(target_family = "unix")]
	{
		file.read_exact_at(&mut buffer, byte_offset)?;
	}

	#[cfg(target_family = "windows")]
	{
		file.seek_read(&mut buf, byte_offset as u64)?;
	}

	ring_context.update(&buffer);

	let digest = ring_context.finish();

	Ok(HEXLOWER.encode(digest.as_ref()))
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
