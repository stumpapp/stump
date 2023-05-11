mod generic;
mod process;
mod thumbnail;
mod webp;

pub use self::webp::WebpProcessor;
pub use generic::GenericImageProcessor;
pub use process::{
	ImageFormat, ImageProcessor, ImageProcessorOptions, ImageResizeMode,
	ImageResizeOptions,
};
pub use thumbnail::{
	generate_thumbnail, generate_thumbnails, get_thumbnail_path, remove_thumbnail,
	remove_thumbnails,
};
