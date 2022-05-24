use image::{io::Reader, EncodableLayout};
use webp::{Encoder, WebPMemory};
use std::path::{Path};

use anyhow::Result;

pub fn webp_from_path<P: AsRef<Path>>(
    file_path: P,
) -> Result<Vec<u8>> {
    let image = Reader::open(file_path.as_ref())?
        .with_guessed_format()?
        .decode()?;

    let encoder: Encoder = Encoder::from_image(&image).map_err(|err| {
        anyhow::anyhow!("Failed to create webp encoder: {}", err)
    })?;

    let encoded_webp: WebPMemory = encoder.encode(65f32);

    Ok(encoded_webp.as_bytes().to_vec())
}

// FIXME: this is **super** slow, might be my implementation but might just not be worth it..
// I might consider making this a server side configuration to store thumbnails as low-res
// webp images during analysis, something like `.stump/cache/thumbnails/<id>.webp`, and then
// instead of converting on the request, I just look for the thumbnail in that directory and serve
// it up (if it exists)
pub fn webp_from_bytes(bytes: &[u8]) -> Result<Vec<u8>> {
    let image = image::load_from_memory(bytes)?;

    let encoder: Encoder = Encoder::from_image(&image).map_err(|err| {
        anyhow::anyhow!("Failed to create webp encoder: {}", err)
    })?;

    let encoded_webp: WebPMemory = encoder.encode(5.0);

    Ok(encoded_webp.as_bytes().to_vec())
}


// TODO: tests
#[cfg(test)]
mod tests {
    // use super::*;
}
