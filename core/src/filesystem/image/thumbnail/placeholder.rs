use base64::prelude::*;
use image::{self, DynamicImage};
use kmeans_colors::{get_kmeans, Kmeans, Sort};
use models::shared::image::{ImageColor, ImageMetadata};
use palette::{cast::from_component_slice, FromColor, IntoColor, Lab, Srgb};
use rust_decimal::Decimal;
use std::path::Path;
use thumbhash::rgba_to_thumb_hash;
use tokio::{sync::oneshot, task::spawn_blocking};

use crate::filesystem::image::ProcessorError;

pub async fn generate_image_metadata(
	path: &Path,
) -> Result<ImageMetadata, ProcessorError> {
	let (tx, rx) = oneshot::channel();

	let handle = spawn_blocking({
		let path = path.to_path_buf();
		move || {
			let result = _generate_image_metadata_from_path(&path);
			let send_result = tx.send(result);
			tracing::trace!(
				is_err = send_result.is_err(),
				"Sending generate result to channel"
			);
		}
	});

	match rx.await {
		Ok(result) => result,
		Err(e) => {
			// Note: `abort` has no affect on blocking threads which have already been spawned,
			// so we just have to wait for the thread to finish.
			// See: https://docs.rs/tokio/latest/tokio/task/fn.spawn_blocking.html
			handle
				.await
				.map_err(|e| ProcessorError::UnknownError(e.to_string()))?;
			// If we reach this point, it means the thread finished but we never got a result
			Err(ProcessorError::UnknownError(format!(
				"Result never received: {}",
				e
			)))
		},
	}
}

pub async fn generate_image_metadata_from_bytes(
	bytes: Vec<u8>,
) -> Result<ImageMetadata, ProcessorError> {
	let (tx, rx) = oneshot::channel();

	let handle = spawn_blocking(move || {
		let result = _generate_image_metadata_from_bytes(&bytes);
		let send_result = tx.send(result);
		tracing::trace!(
			is_err = send_result.is_err(),
			"Sending generate result to channel"
		);
	});

	match rx.await {
		Ok(result) => result,
		Err(e) => {
			handle
				.await
				.map_err(|e| ProcessorError::UnknownError(e.to_string()))?;
			Err(ProcessorError::UnknownError(format!(
				"Result never received: {}",
				e
			)))
		},
	}
}

fn _generate_image_metadata_from_path(
	path: &Path,
) -> Result<ImageMetadata, ProcessorError> {
	let img = image::open(path)?;
	_generate_image_metadata_from_image(img)
}

fn _generate_image_metadata_from_bytes(
	bytes: &[u8],
) -> Result<ImageMetadata, ProcessorError> {
	let img = image::load_from_memory(bytes)?;
	_generate_image_metadata_from_image(img)
}

fn _generate_image_metadata_from_image(
	img: DynamicImage,
) -> Result<ImageMetadata, ProcessorError> {
	// 7 seems to be a good number that balances simpler vs complex images
	let colors = process_image_colors_from_image(&img, 7)?;
	let average_color_vec = process_image_colors_from_image(&img, 1)?;
	let thumbhash = process_image_thumbhash_from_image(&img)?;

	Ok(ImageMetadata {
		average_color: average_color_vec.first().map(|c| c.color.clone()),
		colors,
		thumbhash: Some(thumbhash),
	})
}

/// Processes an image to extract a color palette.
/// * `path` - The path to the image.
/// * `palette_size` - The number of colors to find for the color palette.
///
/// Returns a vector of colors with percentages, or an error.
pub fn process_image_colors(
	path: &Path,
	palette_size: usize,
) -> Result<Vec<ImageColor>, ProcessorError> {
	let dyn_img = image::open(path)?;
	process_image_colors_from_image(&dyn_img, palette_size)
}

/// Processes an image from bytes to extract a color palette.
/// * `bytes` - The image data as bytes.
/// * `palette_size` - The number of colors to find for the color palette.
///
/// Returns a vector of colors with percentages, or an error.
pub fn process_image_colors_from_bytes(
	bytes: &[u8],
	palette_size: usize,
) -> Result<Vec<ImageColor>, ProcessorError> {
	let dyn_img = image::load_from_memory(bytes)?;
	process_image_colors_from_image(&dyn_img, palette_size)
}

/// Core logic for processing an image to extract a color palette.
/// * `dyn_img` - The loaded image.
/// * `palette_size` - The number of colors to find for the color palette.
///
/// Returns a vector of colors with percentages, or an error.
fn process_image_colors_from_image(
	dyn_img: &DynamicImage,
	palette_size: usize,
) -> Result<Vec<ImageColor>, ProcessorError> {
	// Downscale image (lower res = faster, shouldn't be an issue since we want colours)
	let img = dyn_img.thumbnail(200, 320).into_rgb8();

	// Convert to usable format (can use LAB or RGB: LAB is more accurate, RGB may be slightly faster)
	let img_vec: &[u8] = img.as_raw();
	let img_lab: Vec<Lab> = from_component_slice::<Srgb<u8>>(img_vec)
		.iter()
		.map(|x| x.into_linear().into_color())
		.collect();

	// Iterate over 4 runs, keep the best results (1 colour only needs 1 run)
	let runs = if palette_size == 1 { 1 } else { 4 };
	let mut result = Kmeans::new();
	for i in 0..runs {
		// use get_kmeans or get_kmeans_hamerly (seemed like similar speed)
		let run_result = get_kmeans(palette_size, 20, 0.02, false, &img_lab, i as u64);
		if run_result.score < result.score {
			result = run_result;
		}
	}

	// Process data (sorted by highest to lowest percentage)
	let res = Lab::sort_indexed_colors(&result.centroids, &result.indices);

	// Convert the colours to ImageColor structs with HEX strings and percentages
	let colors: Vec<ImageColor> = res
		.into_iter()
		.map(|data| {
			// LAB -> RGB
			let rgb_f32: Srgb<f32> = Srgb::from_color(data.centroid);
			// Floating point (0.0-1.0) to integers (0-255)
			let rgb_u8: Srgb<u8> = rgb_f32.into_format();
			// RGB -> HEX
			let color =
				format!("#{:02x}{:02x}{:02x}", rgb_u8.red, rgb_u8.green, rgb_u8.blue);

			let percentage = Decimal::from_f32_retain(data.percentage)
				.unwrap_or_else(|| {
					tracing::warn!(
						value = data.percentage,
						"Failed to convert color percentage to Decimal"
					);
					Decimal::from(0)
				})
				// We only need 3 decimal places for the stored percentages
				.round_dp(3);

			ImageColor { color, percentage }
		})
		.collect();

	Ok(colors)
}

/// Processes an image to extract a thumbhash.
/// * `path` - The path to the image.
///
/// Returns the thumbhash as a base64 string, or an error.
pub fn process_image_thumbhash(path: &Path) -> Result<String, ProcessorError> {
	let dyn_img = image::open(path)?;
	process_image_thumbhash_from_image(&dyn_img)
}

/// Processes an image from bytes to extract a thumbhash.
/// * `bytes` - The image data as bytes.
///
/// Returns the thumbhash as a base64 string, or an error.
pub fn process_image_thumbhash_from_bytes(
	bytes: &[u8],
) -> Result<String, ProcessorError> {
	let dyn_img = image::load_from_memory(bytes)?;
	process_image_thumbhash_from_image(&dyn_img)
}

/// Core logic for processing an image to extract a thumbhash.
/// * `dyn_img` - The loaded image.
///
/// Returns the thumbhash as a base64 string, or an error.
fn process_image_thumbhash_from_image(
	dyn_img: &DynamicImage,
) -> Result<String, ProcessorError> {
	// image must be ≤ 100px
	let img = dyn_img.thumbnail(100, 100).into_rgba8();
	let (w, h) = img.dimensions();

	let img_vec: &[u8] = img.as_raw();
	let thumbhash_binary = rgba_to_thumb_hash(w as usize, h as usize, img_vec);
	let thumbhash_base64 = BASE64_STANDARD.encode(thumbhash_binary);

	Ok(thumbhash_base64)
}
