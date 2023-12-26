use std::{collections::HashMap, fs::File, io::Write, path::PathBuf, sync::Arc};

use crate::{
	config::StumpConfig,
	filesystem::{
		image::{
			GenericImageProcessor, ImageFormat, ImageProcessor, ImageProcessorOptions,
			WebpProcessor,
		},
		media, FileError,
	},
	prisma::{media as prisma_media, series},
};

pub struct ThumbnailManager {
	config: Arc<StumpConfig>,
	thumbnail_contents: HashMap<String, PathBuf>,
}

impl ThumbnailManager {
	pub fn new(config: Arc<StumpConfig>) -> Result<Self, FileError> {
		// This hashmap will hold the id : PathBuf for each item in the thumbnail dir.
		let mut thumbnail_contents = HashMap::new();

		// Take inventory of the thumbnail_dir's contents
		let read_dir = config.get_thumbnails_dir().read_dir()?;
		for item in read_dir.into_iter() {
			match item {
				// Move on if we can't read something
				Err(_) => continue,
				// Otherwise let's log it
				Ok(item) => {
					let path = item.path();
					// Test if the path has a filename, if it does, add it to the hashmap
					if let Some(file_name) = item.path().file_name() {
						let file_name = file_name.to_string_lossy().to_string();
						thumbnail_contents.insert(file_name, path);
					}
				},
			}
		}

		Ok(Self {
			config,
			thumbnail_contents,
		})
	}

	pub fn generate_thumbnail(
		&mut self,
		media_item: &prisma_media::Data,
		options: ImageProcessorOptions,
	) -> Result<(), FileError> {
		let media_id = media_item.id.clone();
		let media_path = media_item.path.clone();

		let (_, page_data) =
			media::get_page(&media_path, options.page.unwrap_or(1), &self.config)?;
		let ext = options.format.extension();

		let thumbnail_path = self
			.config
			.get_thumbnails_dir()
			.join(format!("{}.{}", &media_id, ext));

		if !thumbnail_path.exists() {
			let image_buffer = match options.format {
				ImageFormat::Webp => WebpProcessor::generate(&page_data, options)?,
				_ => GenericImageProcessor::generate(&page_data, options)?,
			};

			let mut image_file = File::create(&thumbnail_path)?;
			image_file.write_all(&image_buffer)?;

			// Write new thumbnail into hashmap
			self.thumbnail_contents.insert(media_id, thumbnail_path);
		} else {
			tracing::trace!(
				?thumbnail_path,
				media_id,
				"Thumbnail already exists for media"
			)
		}

		Ok(())
	}

	pub fn remove_thumbnail(&mut self, media_id: &String) -> Result<(), FileError> {
		if let Some(path) = self.thumbnail_contents.get(media_id) {
			std::fs::remove_file(path)?;
			self.thumbnail_contents.remove(media_id);
		}

		Ok(())
	}

	pub fn has_thumbnail(&self, media_id: &String) -> bool {
		self.thumbnail_contents.contains_key(media_id)
	}
}
