use std::{
	collections::{HashMap, HashSet},
	path::{Path, PathBuf},
};

use prisma_client_rust::{raw, PrismaValue};
use walkdir::{DirEntry, WalkDir};

use crate::{
	config::context::Context,
	prisma::{library, media, series},
	types::{
		alias::{ProcessResult},
		errors::{ApiError, ProcessFileError, ScanError},
		event::ClientEvent,
		models::MediaMetadata,
	}, fs::{rar::process_rar, zip::process_zip},
};

use super::{ScannedFileTrait};

pub struct LibraryScanner {
	runner_id: String,
	ctx: Context,
	library: library::Data,
	series_map: HashMap<String, series::Data>,
	media_map: HashMap<String, media::Data>,
}

// #[async_trait::async_trait]
// impl ScannerJob for LibraryScanner {
//     async fn precheck<T>() -> ApiResult<library::Data> {
//         todo!()
//     }

//     async fn scan(&mut self) {
//         todo!()
//     }
// }

impl LibraryScanner {
	pub fn new(library: library::Data, ctx: Context, runner_id: String) -> LibraryScanner {
		let series = library
			.series()
			.expect("Failed to get series in library")
			.to_owned();

		let mut series_map = HashMap::new();
		let mut media_map = HashMap::new();

		// TODO: Don't love this solution...
		for s in series {
			let media = s.media().expect("Failed to get media in series").to_owned();

			series_map.insert(s.path.clone(), s);

			for m in media {
				media_map.insert(m.path.clone(), m);
			}
		}

		LibraryScanner {
			ctx,
			library,
			series_map,
			media_map,
			runner_id,
		}
	}

	fn on_progress(&self, event: ClientEvent) {
		let _ = self.ctx.emit_client_event(event);
	}

	fn get_series(&self, path: &Path) -> Option<&series::Data> {
		self.series_map.get(path.to_str().expect("Invalid key"))
	}

	fn get_media_by_path(&self, key: &Path) -> Option<&media::Data> {
		self.media_map.get(key.to_str().expect("Invalid key"))
	}

	// TODO: I'm not sure I love this solution. I could check if the Path.parent is the series path, but
	// not sure about that either
	/// Get the series id for the given path. Used to determine the series of a media
	/// file at a given path.
	fn get_series_id(&self, path: &Path) -> Option<String> {
		self.series_map
			.iter()
			.find(|(_, s)| path.to_str().unwrap_or("").to_string().contains(&s.path))
			.map(|(_, s)| s.id.clone())
	}

	fn process_entry(&self, entry: &DirEntry) -> ProcessResult {
		match entry.file_name().to_str() {
			Some(name) if name.ends_with("cbr") => process_rar(entry),
			Some(name) if name.ends_with("cbz") => process_zip(entry),
			// Some(name) if name.ends_with("epub") => process_epub(entry),
			_ => Err(ProcessFileError::UnsupportedFileType),
		}
	}

	async fn insert_media(
		&self,
		entry: &DirEntry,
		series_id: String,
	) -> Result<media::Data, ScanError> {
		let processed_entry = self.process_entry(entry)?;

		let path = entry.path();

		let metadata = match entry.metadata() {
			Ok(metadata) => Some(metadata),
			_ => None,
		};

		let path_str = path.to_str().unwrap().to_string();
		let mut name = entry.file_name().to_str().unwrap().to_string();
		let ext = path.extension().unwrap().to_str().unwrap().to_string();

		// remove extension from name, not sure why file_name() includes it smh
		if name.ends_with(format!(".{}", ext).as_str()) {
			name.truncate(name.len() - (ext.len() + 1));
		}

		let comic_info = match processed_entry.metadata {
			Some(info) => info,
			None => MediaMetadata::default(),
		};

		let mut size: u64 = 0;
		// let mut modified: DateTime<FixedOffset> = chrono::Utc::now().into();

		if let Some(metadata) = metadata {
			size = metadata.len();

			// if let Ok(st) = metadata.modified() {
			// 	let utc: DateTime<Utc> = st.into();
			// 	modified = utc.into();
			// }
		}

		let media = self
			.ctx
			.db
			.media()
			.create(
				media::name::set(name),
				media::size::set(size.try_into().unwrap()),
				media::extension::set(ext),
				media::pages::set(match comic_info.page_count {
					Some(count) => count as i32,
					None => processed_entry.entries.len() as i32,
				}),
				media::path::set(path_str),
				vec![
					media::checksum::set(processed_entry.checksum),
					media::description::set(comic_info.summary),
					media::series::link(series::id::equals(series_id)),
					// media::updated_at::set(modified),
				],
			)
			.exec()
			.await?;

		log::info!("Created new media: {:?}", media);

		self.on_progress(ClientEvent::CreatedMedia(media.clone()));

		Ok(media)
	}

	async fn insert_series(&self, entry: &DirEntry) -> Result<series::Data, ScanError> {
		let path = entry.path();

		// TODO: use this??
		// let metadata = match path.metadata() {
		// 	Ok(metadata) => Some(metadata),
		// 	_ => None,
		// };

		// TODO: change error
		let name = match path.file_name() {
			Some(name) => match name.to_str() {
				Some(name) => name.to_string(),
				_ => return Err(ScanError::Unknown("Failed to get name".to_string())),
			},
			_ => return Err(ScanError::Unknown("Failed to get name".to_string())),
		};

		let series = self
			.ctx
			.db
			.series()
			.create(
				series::name::set(name),
				series::path::set(path.to_str().unwrap().to_string()),
				vec![series::library::link(library::id::equals(
					self.library.id.clone(),
				))],
			)
			.exec()
			.await?;

		self.on_progress(ClientEvent::CreatedSeries(series.clone()));

		Ok(series)
	}

	pub async fn precheck(path: String, ctx: &Context) -> Result<library::Data, ApiError>  {
		let library = ctx.db
			.library()
			.find_unique(library::path::equals(path.clone()))
			.with(library::series::fetch(vec![]).with(series::media::fetch(vec![])))
			.exec()
			.await?;

		if library.is_none() {
			return Err(ApiError::NotFound(format!(
				"Library not found: {}",
				path
			)));
		}

		// TODO: I should ~probably~ mark all series and series media as MISSING
		if !Path::new(&path).exists() {
			return Err(ApiError::InternalServerError(format!(
				"Library path does not exist in fs: {}",
				path
			)));
		}

		let library = library.unwrap();

		log::debug!("Prechecking library: {:?}", &library);

		let library_path = PathBuf::from(&library.path);

		let series_list = library.series().unwrap();
		let series_ids = series_list.iter().map(|s| s.id.clone()).collect::<Vec<_>>();

		let mut invalid_paths = HashSet::new();

		for series in series_list {
			let series_path = PathBuf::from(&series.path);

			let series_parent = series_path.parent().unwrap();

			if !series_parent.eq(&library_path) {
				log::debug!("Series path doesn't match library path: {:?}", series);
				invalid_paths.insert(String::from(series_parent.to_str().unwrap()));
			}
		}

		if invalid_paths.len() == 0 {
			return Ok(library);
		}

		for invalid_path in invalid_paths {
			let series_id_ref: &Vec<String> = series_ids.as_ref();
			let correct_base = library_path.to_str().unwrap().to_string();


			// update series paths
			ctx
				.db
				._execute_raw(raw!(
					"UPDATE series SET path=REPLACE(path,{},{}) WHERE libraryId={}",
					PrismaValue::String(invalid_path.clone()),
					PrismaValue::String(correct_base.clone()),
					PrismaValue::String(library.id.clone())
				))
				.await?;

				// update media paths
			// NOTE: ._execute_raw() throws an error using PrismaValue::List with Sqlite.
			let media_query = format!(
				"UPDATE media SET path=REPLACE(path, \"{}\", \"{}\") WHERE seriesId in ({})", 
				invalid_path, 
				correct_base, 
				series_id_ref.into_iter().map(|id| format!("\"{}\"", id)).collect::<Vec<_>>().join(",")
			);

			ctx
				.db
				._execute_raw(raw!(&media_query))
				.await?;
		}

		// Note: at this point, this should never fail so I am unwrapping
		let library =  ctx.db
			.library()
			.find_unique(library::path::equals(path.clone()))
			.with(library::series::fetch(vec![]).with(series::media::fetch(vec![])))
			.exec()
			.await?
			.unwrap();

		Ok(library)

	}

	pub async fn scan_library(&mut self) {
		let mut visited_series = HashMap::<String, bool>::new();
		let mut visited_media = HashMap::<String, bool>::new();

		for (i, entry) in WalkDir::new(&self.library.path)
			.into_iter()
			.filter_map(|e| e.ok())
			.enumerate()
		{
			let entry_path = entry.path();

			log::info!("Scanning: {:?}", entry_path);

			// TODO: send progress (use i)
			// self.on_progress(vec![])
			self.on_progress(ClientEvent::job_progress(
				self.runner_id.clone(),
				i + 1,
				None,
				Some(format!("Analyzing {:?}", entry_path)),
			));

			// FIXME: won't work for library updates after path change
			let series = self.get_series(&entry_path);
			let series_exists = series.is_some();

			if entry_path.is_dir() && !series_exists {
				if !entry_path.dir_has_media() {
					log::info!("Skipping empty directory: {:?}", entry_path);
					// TODO: send progress
					continue;
				}

				log::info!("Creating new series: {:?}", entry_path);

				match self.insert_series(&entry).await {
					Ok(series) => {
						visited_series.insert(series.id.clone(), true);
						self.series_map.insert(series.path.clone(), series);
					},
					Err(e) => {
						log::error!("Failed to insert series: {:?}", e);
						// TODO: send progress
						// self.on_progress(vec![])
					},
				}

				continue;
			}

			if series_exists {
				let series = series.unwrap();
				log::info!("Series exists: {:?}", series.path);
				visited_series.insert(series.id.clone(), true);

				// TODO: send progress

				continue;
			} else if entry_path.should_ignore() {
				log::info!("Skipping ignored file: {:?}", entry_path);
				// TODO: send progress
				continue;
			} else if let Some(media) = self.get_media_by_path(&entry_path) {
				// log::info!("Existing media: {:?}", media);
				visited_media.insert(media.id.clone(), true);
				// TODO: send progress
				// self.analyze_media(media).await;
				continue;
			}

			// TODO: don't do this :)
			let series_id = self.get_series_id(&entry_path).expect(&format!(
				"Could not determine series for new media: {:?}",
				entry_path
			));

			log::info!("New media at {:?} in series {:?}", &entry_path, series_id);

			match self.insert_media(&entry, series_id).await {
				Ok(media) => {
					let id = media.id.clone();
					self.media_map.insert(media.path.clone(), media);

					visited_media.insert(id, true);
				},
				Err(e) => {
					log::error!("Failed to insert media: {:?}", e);
					// TODO: send progress
				},
			}
		}

		// for (_, s) in self.series.iter() {
		//     match visited_series.get(&s.id) {
		//         Some(true) => {
		//             if s.status == FileStatus::Missing {
		//                 self.set_series_status(s.id, FileStatus::Ready, s.path.clone())
		//                     .await;
		//             }
		//         }
		//         _ => {
		//             if s.library_id == library.id {
		//                 log::info!("MOVED/MISSING SERIES: {}", s.path);
		//                 self.set_series_status(s.id, FileStatus::Missing, s.path.clone())
		//                     .await;
		//             }
		//         }
		//     }
		// }

		// for media in self.media.values() {
		//     match visited_media.get(&media.id) {
		//         Some(true) => {
		//             if media.status == FileStatus::Missing {
		//                 self.set_media_status(media.id, FileStatus::Ready, media.path.clone())
		//                     .await;
		//             }
		//         }
		//         _ => {
		//             if media.library_id == library.id {
		//                 log::info!("MOVED/MISSING MEDIA: {}", media.path);
		//                 self.set_media_status(media.id, FileStatus::Missing, media.path.clone())
		//                     .await;
		//             }
		//         }
		//     }
		// }
	}
}

//     async fn analyze_media(&self, key: String) {
//         let media = self.media.get(&key).unwrap();

//         let id = media.id;

//         println!("analyzing media: {:?}", media);

//         if media.status == FileStatus::Missing {
//             log::info!("Media found");
//             self.set_media_status(id, FileStatus::Ready, media.path.clone())
//                 .await;
//         }

//         // TODO: more checks??
//     }

//     async fn set_media_status(&self, id: i32, status: FileStatus, path: String) {
//         match queries::media::set_status(self.db, id, status).await {
//             Ok(_) => {
//                 log::info!("set media status: {:?} -> {:?}", path, status);
//                 if status == FileStatus::Missing {
//                     self.event_handler
//                         .log_error(format!("Missing file: {}", path));
//                 }
//             }
//             Err(err) => {
//                 self.event_handler.log_error(err);
//             }
//         }
//     }

//     async fn set_series_status(&self, id: i32, status: FileStatus, path: String) {
//         match queries::series::set_status(self.db, id, status).await {
//             Ok(_) => {
//                 log::info!("set series status: {:?} -> {:?}", path, status);
//                 if status == FileStatus::Missing {
//                     self.event_handler
//                         .log_error(format!("Missing file: {}", path));
//                 }
//             }
//             Err(err) => {
//                 self.event_handler.log_error(err);
//             }
//         }
//     }
