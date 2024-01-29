mod generic;
mod process;
mod thumbnail;
mod thumbnail_job;
mod webp;

pub use self::webp::WebpProcessor;
pub use generic::GenericImageProcessor;
pub use process::{
	ImageFormat, ImageProcessor, ImageProcessorOptions, ImageResizeMode,
	ImageResizeOptions,
};
pub use thumbnail::{
	generate_thumbnail, generate_thumbnails, remove_thumbnails, remove_thumbnails_of_type,
};
pub use thumbnail_job::{ThumbnailJob, ThumbnailJobConfig, THUMBNAIL_JOB_NAME};
