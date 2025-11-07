use image;
use kmeans_colors::{get_kmeans, Kmeans, Sort};
use palette::{
	cast::from_component_slice, color_difference::Ciede2000, FromColor, Hsl, IntoColor,
	Lab, Srgb,
};
use std::path::Path;

#[derive(Debug)]
struct ColorData {
	lab: Lab,
	hsl: Hsl,
	percentage: f32,
}

/// Processes an image to extract a colour palette.
/// * `path` - The path to the image.
/// * `k` - The number of initial candidate colours to find (we always use 1 or 7)
///
/// Returns a vector of either 1 or 3 "best" colours as HEX strings, or an error. "Best" is defined as high saturation, distinct and large coverage.
pub fn process_image_colors(
	path: &Path,
	k: usize,
) -> Result<Vec<String>, Box<dyn std::error::Error>> {
	// Load image
	let dyn_img = image::open(path)?;

	// Downscale image (lower res = faster, shouldn't be an issue since we want colours)
	let nwidth = if k == 1 { 1 } else { 200 };
	let nheight = (nwidth as f32 * 1.5).floor() as u32;
	let img = dyn_img.thumbnail(nwidth, nheight).into_rgb8();

	// Convert to usable format (can use LAB or RGB: LAB is more accurate, RGB may be slightly faster)
	let img_vec: &[u8] = img.as_raw();
	let img_lab: Vec<Lab> = from_component_slice::<Srgb<u8>>(img_vec)
		.iter()
		.map(|x| x.into_linear().into_color())
		.collect();

	// Iterate over 4 runs, keep the best results (1 colour only needs 1 run)
	let runs = if k == 1 { 1 } else { 4 };
	let mut result = Kmeans::new();
	for i in 0..runs {
		// use get_kmeans or get_kmeans_hamerly (seemed like similar speed)
		let run_result = get_kmeans(k, 20, 0.02, false, &img_lab, 42 + i as u64);
		if run_result.score < result.score {
			result = run_result;
		}
	}

	// Process data (sorted by highest to lowest percentage)
	let res = Lab::sort_indexed_colors(&result.centroids, &result.indices);

	// Add hsl (used later for colour selection)
	let mut candidates: Vec<ColorData> = res
		.iter()
		.map(|data| {
			let lab_color = data.centroid;
			let rgb: Srgb<f32> = Srgb::from_linear(lab_color.into_color());
			let hsl: Hsl = rgb.into_color();

			ColorData {
				lab: lab_color,
				hsl,
				percentage: data.percentage,
			}
		})
		.collect();

	// Select the "best" colours, meaning:
	// saturated (the s in hsl):
	// distinct (measured using Ciede2000)
	// and large coverage (measured using percentage)
	const DIFFERENCE_WEIGHT: f32 = 0.7; // larger = more penalisation of similar colours
	const PERCENTAGE_WEIGHT: f32 = 0.6; // larger = more penalisation of low coverage colours

	// Sort by saturation (highest to lowest)
	candidates.sort_unstable_by(|a, b| {
		b.hsl.saturation.partial_cmp(&a.hsl.saturation).unwrap()
	});

	// We want to return 1 or 3 colours
	let final_palette_size = if k == 1 || k == 2 { 1 } else { 3 };
	let mut final_palette: Vec<ColorData> = Vec::with_capacity(final_palette_size);

	// Add the most saturated colour the palette
	final_palette.push(candidates.remove(0));

	// Add the next two colours
	while final_palette.len() < final_palette_size && !candidates.is_empty() {
		let best_candidate_index = candidates
			.iter()
			.enumerate()
			.map(|(i, candidate)| {
				let minimum_difference = final_palette
					.iter()
					.map(|selected| selected.lab.difference(candidate.lab))
					.fold(f32::INFINITY, f32::min);
				let score = candidate.hsl.saturation
					* minimum_difference.powf(DIFFERENCE_WEIGHT)
					* candidate.percentage.powf(PERCENTAGE_WEIGHT);
				(i, score)
			})
			.max_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal))
			.map(|(i, _score)| i);

		if let Some(index) = best_candidate_index {
			final_palette.push(candidates.remove(index));
		} else {
			break;
		}
	}

	// Sort by percentage (highest to lowest)
	// This is to set the order of colours for the mesh gradient. There may be a better looking way to explore later.
	final_palette
		.sort_unstable_by(|a, b| b.percentage.partial_cmp(&a.percentage).unwrap());

	// Convert the colours to HEX strings
	let hex: Vec<String> = final_palette
		.into_iter()
		.map(|data| {
			// LAB -> RGB
			let rgb_f32: Srgb<f32> = Srgb::from_color(data.lab);
			// Floating point (0.0-1.0) to integers (0-255)
			let rgb_u8: Srgb<u8> = rgb_f32.into_format();
			// RGB -> HEX
			format!("#{:02x}{:02x}{:02x}", rgb_u8.red, rgb_u8.green, rgb_u8.blue)
		})
		.collect();

	Ok(hex)
}
