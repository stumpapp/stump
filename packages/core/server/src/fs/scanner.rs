use std::{
	collections::HashMap,
	path::{Path, PathBuf},
	sync::Arc,
};

use prisma_client_rust::chrono::{self, DateTime, FixedOffset, Utc};
use walkdir::{DirEntry, WalkDir};

use crate::{
	config::context::Context,
	job::Job,
	prisma::{library, media, series, PrismaClient},
	types::{
		errors::{ApiError, ProcessFileError, ScanError},
		models::ComicInfo,
	},
};

use super::{media_file::ProcessResult, rar::process_rar, zip::process_zip};

#[derive(Debug)]
pub struct ScannerJob {
	pub path: String,
}

#[async_trait::async_trait]
impl Job for ScannerJob {
	async fn run(&self, ctx: Context) -> Result<(), ApiError> {
		let db = ctx.get_db();

		let library = db
			.library()
			.find_unique(library::path::equals(self.path.clone()))
			.with(library::series::fetch(vec![]).with(series::media::fetch(vec![])))
			.exec()
			.await?;

		if library.is_none() {
			return Err(ApiError::NotFound(format!(
				"Library not found: {}",
				self.path
			)));
		}

		let library = library.unwrap();

		// TODO: not right lol
		// TODO: should be in context?
		let on_progress = |events: Vec<String>| {
			for event in events {
				ctx.emit_client_event(event).unwrap();
			}
		};

		// TODO: removed this
		ctx.emit_client_event(format!("Scanning library: {}", library.path.clone()));

		let mut scanner = Scanner::new(library, ctx.db.clone());

		scanner.scan_library().await;

		println!("DONE!!!!!!!");

		Ok(())
	}
}

pub trait ScannedFileTrait {
	fn get_kind(&self) -> std::io::Result<Option<infer::Type>>;
	fn is_visible_file(&self) -> bool;
	fn should_ignore(&self) -> bool;
	fn dir_has_media(&self) -> bool;
}

impl ScannedFileTrait for Path {
	fn get_kind(&self) -> std::io::Result<Option<infer::Type>> {
		infer::get_from_path(self)
	}

	fn is_visible_file(&self) -> bool {
		let filename = self
			.file_name()
			.unwrap_or_default()
			.to_str()
			.expect(format!("Malformed filename: {:?}", self.as_os_str()).as_str());

		if self.is_dir() {
			return false;
		} else if filename.starts_with(".") {
			return false;
		}

		true
	}

	fn should_ignore(&self) -> bool {
		if !self.is_visible_file() {
			log::info!("Ignoring hidden file: {}", self.display());
			return true;
		}

		let kind = infer::get_from_path(self);

		if kind.is_err() {
			log::info!("Could not infer file type for {:?}: {:?}", self, kind);
			return true;
		}

		let kind = kind.unwrap();

		match kind {
			Some(k) => {
				let mime = k.mime_type();

				match mime {
					"application/zip" => false,
					"application/vnd.rar" => false,
					"application/epub+zip" => false,
					"application/pdf" => false,
					_ => {
						log::info!("Ignoring file {:?} with mime type {}", self, mime);
						true
					},
				}
			},
			None => {
				log::info!("Unable to infer file type: {:?}", self);
				return true;
			},
		}
	}

	fn dir_has_media(&self) -> bool {
		if !self.is_dir() {
			return false;
		}

		let items = std::fs::read_dir(self);

		if items.is_err() {
			return false;
		}

		let items = items.unwrap();

		items
			.filter_map(|item| item.ok())
			.any(|f| !f.path().should_ignore())
	}
}

struct Scanner {
	db: Arc<PrismaClient>,
	library: library::Data,
	series_map: HashMap<String, series::Data>,
	media_map: HashMap<String, media::Data>,
	// on_progress: Box<dyn Fn(Vec<Json<Event>>)>,
}

impl Scanner {
	pub fn new(library: library::Data, db: Arc<PrismaClient>) -> Scanner {
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

		Scanner {
			db,
			library,
			series_map,
			media_map,
		}
	}

	fn get_series(&self, path: &Path) -> Option<&series::Data> {
		self.series_map.get(path.to_str().expect("Invalid key"))
	}

	fn get_media(&self, key: &Path) -> Option<&media::Data> {
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
		let (info, pages) = self.process_entry(entry)?;

		let path = entry.path();

		let metadata = match entry.metadata() {
			Ok(metadata) => Some(metadata),
			_ => None,
		};

		let path_str = path.to_str().unwrap().to_string();
		let name = entry.file_name().to_str().unwrap().to_string();
		let ext = path.extension().unwrap().to_str().unwrap().to_string();

		let comic_info = match info {
			Some(info) => info,
			None => ComicInfo::default(),
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
			.db
			.media()
			.create(
				media::name::set(name),
				media::size::set(size.try_into().unwrap()),
				media::extension::set(ext),
				media::pages::set(match comic_info.page_count {
					Some(count) => count as i32,
					None => pages.len() as i32,
				}),
				media::path::set(path_str),
				vec![
					media::description::set(comic_info.summary),
					media::series::link(series::id::equals(series_id)),
					// media::updated_at::set(modified),
				],
			)
			.exec()
			.await?;

		log::info!("Created new media: {:?}", media);

		// TODO: send progress
		// self.on_progress(vec![])

		Ok(media)
	}

	async fn insert_series(&self, entry: &DirEntry) -> Result<series::Data, ScanError> {
		let path = entry.path();

		let metadata = match path.metadata() {
			Ok(metadata) => Some(metadata),
			_ => None,
		};

		// TODO: change error
		let name = match path.file_name() {
			Some(name) => match name.to_str() {
				Some(name) => name.to_string(),
				_ => return Err(ScanError::Unknown("Failed to get name".to_string())),
			},
			_ => return Err(ScanError::Unknown("Failed to get name".to_string())),
		};

		let series = self
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

		let files_to_process = WalkDir::new(&self.library.path)
			.into_iter()
			.filter_map(|e| e.ok())
			.count();

		// TODO: send progress
		// self.on_progress(vec![])

		Ok(series)
	}

	pub async fn scan_library(&mut self) {
		let library_path = PathBuf::from(&self.library.path);

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
			} else if let Some(media) = self.get_media(&entry_path) {
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
					visited_media.insert(media.id.clone(), true);
					self.media_map.insert(media.path.clone(), media);
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

// pub async fn scan(state: &State, library_id: Option<i32>) -> Result<(), String> {
//     let conn = state.get_connection();
//     let event_handler = state.get_event_handler();

//     let libraries: Vec<library::Model> = match library_id {
//         Some(id) => queries::library::get_library_by_id(conn, id)
//             .await?
//             .map(|l| l.into())
//             .into_iter()
//             .collect(),
//         None => queries::library::get_libraries(conn).await?,
//     };

//     if libraries.is_empty() {
//         let mut message = "No libraries configured.".to_string();

//         if library_id.is_some() {
//             message = format!("No library with id: {}", library_id.unwrap());
//         }

//         event_handler.log_error(message.clone());

//         return Err(message);
//     }

//     let series = queries::series::get_series_in_library(conn, library_id).await?;

//     // println!("{:?}", series);

//     let media = queries::media::get_media_with_library_and_series(conn, library_id).await?;

//     // println!("{:?}", media);

//     let mut scanner = Scanner::new(conn, event_handler, series, media);

//     for library in libraries {
//         scanner.scan_library(&library).await;
//     }

//     Ok(())
// }
