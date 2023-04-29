use serde::{Deserialize, Serialize};
use specta::Type;

/// The size factor to use when generating a thumbnail. This can be a
/// scaled factor, where the height and width are scaled by the same factor, a
/// a custom factor, where the height and width are scaled by different factors,
/// or a specific size, where the height and width are set to the specified size.
///
/// All floats are clamped to the range [0.0, 1.0].
#[derive(Serialize, Deserialize, Type)]
#[serde(untagged)]
pub enum ThumbnailSizeFactor {
	Scaled(f32),
	CustomScaled(f32, f32),
	Sized(u32, u32),
}

/// The format to use when generating a thumbnail.
#[derive(Default, Serialize, Deserialize, Type)]
pub enum ThumbnailFormat {
	#[default]
	Webp,
	Jpeg,
	JpegXl,
	Png,
}

pub struct ThumbnailOptions {
	pub size_factor: ThumbnailSizeFactor,
	pub format: ThumbnailFormat,
}

impl Default for ThumbnailOptions {
	fn default() -> Self {
		Self {
			size_factor: ThumbnailSizeFactor::Scaled(0.5),
			..Default::default()
		}
	}
}
