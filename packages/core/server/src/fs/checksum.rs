use anyhow::Result;
use data_encoding::HEXLOWER;
use ring::digest::{Context, SHA256};

use std::fs::File;
#[cfg(target_family = "unix")]
use std::os::unix::prelude::FileExt;

#[cfg(target_family = "windows")]
use std::os::windows::prelude::*;

pub fn digest(path: &str, byte_offset: i32) -> Result<String> {
	let file = File::open(path).unwrap();

	let mut ring_context = Context::new(&SHA256);

	// set the buffer according to the byte_offset, as we will
	// read 0-byte_offset bytes
	let mut buffer = vec![0u8; byte_offset as usize];

	#[cfg(target_family = "unix")]
	{
		file.read_exact_at(&mut buffer, byte_offset as u64)?;
	}

	#[cfg(target_family = "windows")]
	{
		file.seek_read(&mut buf, byte_offset as u64)?;
	}

	ring_context.update(&buffer);

	let digest = ring_context.finish();

	Ok(HEXLOWER.encode(digest.as_ref()))
}
