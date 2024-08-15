use std::{collections::HashMap, fs::File, io::Write, path::PathBuf, sync::Arc};

use rayon::iter::{IntoParallelIterator, ParallelIterator};

use crate::{
	config::StumpConfig,
	filesystem::{
		image::{
			GenericImageProcessor, ImageFormat, ImageProcessor, ImageProcessorOptions,
			WebpProcessor,
		},
		media, FileError,
	},
	prisma::media as prisma_media,
};

#[derive(Default)]
pub struct ParThumbnailGenerationOutput {
	pub created_thumbnails: Vec<(String, PathBuf)>,
	pub errors: Vec<(PathBuf, FileError)>,
}

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
		for item in read_dir.into_iter().filter_map(Result::ok) {
			let path = item.path();
			// Test if the path has a filename, if it does, add it to the hashmap
			if let Some(file_name) = item.path().file_name() {
				let file_name = file_name.to_string_lossy().to_string();
				thumbnail_contents.insert(file_name, path);
			} else {
				tracing::warn!(?path, "Thumbnail file has no filename?");
			}
		}

		Ok(Self {
			config,
			thumbnail_contents,
		})
	}

	pub fn has_thumbnail<S: AsRef<str>>(&self, media_id: S) -> bool {
		self.thumbnail_contents.contains_key(media_id.as_ref())
	}

	/// Inserts thumbnails into the manager's internal hashmap for future reference,
	/// it will assume generation is not necessary.
	pub fn track_thumbnails(
		&mut self,
		media_ids: &[String],
		options: ImageProcessorOptions,
	) {
		let base_path = self.config.get_thumbnails_dir();
		let ext = options.format.extension();

		for id in media_ids {
			let thumbnail_path = base_path.join(format!("{}.{}", id, ext));
			if thumbnail_path.exists() {
				self.thumbnail_contents.insert(id.clone(), thumbnail_path);
			}
		}
	}

	fn do_generate_thumbnail(
		&self,
		media_item: &prisma_media::Data,
		options: ImageProcessorOptions,
	) -> Result<PathBuf, FileError> {
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
		} else {
			tracing::trace!(
				?thumbnail_path,
				media_id,
				"Thumbnail already exists for media"
			)
		}

		Ok(thumbnail_path)
	}

	pub fn generate_thumbnail(
		&mut self,
		media_item: &prisma_media::Data,
		options: ImageProcessorOptions,
	) -> Result<PathBuf, FileError> {
		let path = self.do_generate_thumbnail(media_item, options)?;
		self.thumbnail_contents
			.insert(media_item.id.clone(), path.clone());
		Ok(path)
	}

	pub fn generate_thumbnails_par(
		&self,
		media: &[prisma_media::Data],
		options: ImageProcessorOptions,
	) -> ParThumbnailGenerationOutput {
		let mut output = ParThumbnailGenerationOutput::default();

		// TODO: make this chunk size configurable
		for chunk in media.chunks(5) {
			let results = chunk
				.into_par_iter()
				.map(|m| {
					(
						m.id.clone(),
						m.path.clone(),
						self.do_generate_thumbnail(m, options.clone()),
					)
				})
				.collect::<Vec<_>>();

			let (errors, generated) = results.into_iter().fold(
				(vec![], vec![]),
				|(mut errors, mut generated), (id, path, res)| {
					match res {
						Ok(generated_path) => generated.push((id, generated_path)),
						Err(err) => errors.push((PathBuf::from(path), err)),
					}
					(errors, generated)
				},
			);

			output.errors = errors;
			output.created_thumbnails = generated;
		}

		output
	}

	pub fn remove_thumbnail<S: AsRef<str>>(
		&mut self,
		media_id: S,
	) -> Result<(), FileError> {
		let media_id = media_id.as_ref();
		if let Some(path) = self.thumbnail_contents.get(media_id) {
			std::fs::remove_file(path)?;
			self.thumbnail_contents.remove(media_id);
		} else {
			tracing::warn!(?media_id, "Thumbnail not found in manager");
		}

		Ok(())
	}
}
