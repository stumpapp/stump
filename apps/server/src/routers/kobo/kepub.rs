use std::{
	collections::HashSet,
	ffi::OsString,
	path::{Path, PathBuf},
	process::ExitStatus,
	sync::LazyLock,
	time::Duration,
};

use models::entity::media;
use sha2::{Digest, Sha256};
use stump_core::{
	config::StumpConfig,
	kobo::{
		position::KoboPositionMap,
		sync_types::{BookEntitlementContainer, BookMetadata, Format},
	},
};
use tempfile::Builder;
use thiserror::Error;
use tokio::{
	process::Command,
	sync::{Mutex, MutexGuard, OnceCell},
	time::timeout,
};

// Span-affecting changes must bump this and `KEPUB_CONTENT_VERSION`; this also changes revisions.
const CACHE_SCHEMA: u8 = 1;
const RAW_CONTENT_VERSION: u8 = 1;
const KEPUB_CONTENT_VERSION: u8 = 2;
const CONVERSION_TIMEOUT: Duration = Duration::from_secs(120);
const PREPARE_LOCK_COUNT: usize = 16;

static KEPUBIFY: OnceCell<Option<Kepubify>> = OnceCell::const_new();
// ponytail: 16 stripes bound lock memory; add stripes only if cross-book contention is measured.
static PREPARE_LOCKS: LazyLock<[Mutex<()>; PREPARE_LOCK_COUNT]> =
	LazyLock::new(|| std::array::from_fn(|_| Mutex::new(())));

#[derive(Debug)]
struct Kepubify {
	command: OsString,
	version: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct KoboContentInfo {
	pub is_kepub: bool,
	pub revision_id: String,
	pub size: u64,
}

impl KoboContentInfo {
	pub fn apply_to_metadata(&self, metadata: &mut BookMetadata) {
		metadata.revision_id.clone_from(&self.revision_id);
		for download in &mut metadata.download_urls {
			download.format = if self.is_kepub {
				Format::KEPUB
			} else {
				Format::EPUB3
			};
			download.size = self.size;
		}
	}

	pub fn apply_to_entitlement(&self, entitlement: &mut BookEntitlementContainer) {
		entitlement
			.book_entitlement
			.revision_id
			.clone_from(&self.revision_id);
		self.apply_to_metadata(&mut entitlement.book_metadata);
	}
}

#[derive(Debug)]
pub struct KoboDownload {
	pub path: PathBuf,
	pub filename: String,
	pub content: KoboContentInfo,
	_prepare_guard: MutexGuard<'static, ()>,
}

#[derive(Debug, Error)]
pub enum KepubError {
	#[error("Could not prepare the KEPUB cache: {0}")]
	Cache(#[source] std::io::Error),
	#[error("Could not start kepubify: {0}")]
	Start(#[source] std::io::Error),
	#[error("kepubify timed out")]
	Timeout,
	#[error("kepubify failed with {status}: {stderr}")]
	ConversionFailed { status: ExitStatus, stderr: String },
	#[error("kepubify did not produce a non-empty KEPUB")]
	MissingOutput,
}

/// Returns the server representation version stored in Kobo sync tokens.
/// Version changes force one full sync so existing devices receive new revisions.
pub async fn server_content_version() -> u8 {
	if converter().await.is_some() {
		KEPUB_CONTENT_VERSION
	} else {
		RAW_CONTENT_VERSION
	}
}

pub fn is_kepub_path(path: impl AsRef<Path>) -> bool {
	path.as_ref()
		.file_name()
		.and_then(|name| name.to_str())
		.is_some_and(|name| name.to_ascii_lowercase().ends_with(".kepub.epub"))
}

/// Computes the content identity advertised to Kobo. It also names the cached
/// artifact, keeping device revisions and generated `koboSpan` IDs coupled.
pub fn content_revision(book: &media::Model, is_kepub: bool) -> String {
	content_revision_from_parts(
		&book.id,
		book.size,
		book.modified_at
			.as_ref()
			.map(ToString::to_string)
			.as_deref(),
		book.hash.as_deref(),
		is_kepub,
	)
}

pub async fn content_info(config: &StumpConfig, book: &media::Model) -> KoboContentInfo {
	let source_path = Path::new(&book.path);
	let cache_path = kepub_cache_path(config, book);
	let is_preconverted = is_kepub_path(source_path);
	let force_raw =
		!is_preconverted && cache_entry_exists(&raw_marker_path(config, book)).await;
	let cached_size = if is_preconverted || force_raw {
		None
	} else {
		cache_entry_size(&cache_path).await
	};
	let is_kepub = is_preconverted || cached_size.is_some();
	let size = match cached_size {
		Some(size) => size,
		None => source_size(source_path, book.size).await,
	};

	KoboContentInfo {
		is_kepub,
		revision_id: content_revision(book, is_kepub),
		size,
	}
}

/// Returns a stable source or cached path ready for `ServeFile`.
pub async fn prepare_download(
	config: &StumpConfig,
	book: &media::Model,
) -> Result<KoboDownload, KepubError> {
	prepare_download_with_converter(config, book, converter().await).await
}

async fn prepare_download_with_converter(
	config: &StumpConfig,
	book: &media::Model,
	kepubify: Option<&Kepubify>,
) -> Result<KoboDownload, KepubError> {
	let book_key = Sha256::digest(book.id.as_bytes());
	let guard = PREPARE_LOCKS[usize::from(book_key[0]) % PREPARE_LOCK_COUNT]
		.lock()
		.await;
	let source_path = Path::new(&book.path);
	prune_book_cache(config, book).await;
	if is_kepub_path(source_path) {
		return Ok(KoboDownload {
			path: source_path.to_path_buf(),
			filename: source_filename(source_path),
			content: KoboContentInfo {
				is_kepub: true,
				revision_id: content_revision(book, true),
				size: source_size(source_path, book.size).await,
			},
			_prepare_guard: guard,
		});
	}

	let cache_path = kepub_cache_path(config, book);
	let raw_marker = raw_marker_path(config, book);
	if cache_entry_exists(&raw_marker).await {
		return Ok(source_download(book, guard).await);
	}
	if let Some(size) = cache_entry_size(&cache_path).await {
		return Ok(kepub_download(book, cache_path, size, guard));
	}

	let Some(kepubify) = kepubify else {
		return Ok(source_download(book, guard).await);
	};

	if let Err(error) = convert_and_cache(kepubify, source_path, &cache_path).await {
		tracing::warn!(?error, media_id = %book.id, "Could not convert EPUB; serving the source revision");
		record_raw_fallback(&raw_marker).await?;
		return Ok(source_download(book, guard).await);
	}

	let size = cache_entry_size(&cache_path)
		.await
		.unwrap_or_else(|| u64::try_from(book.size).unwrap_or(0));
	Ok(kepub_download(book, cache_path, size, guard))
}

pub async fn position_map(
	config: &StumpConfig,
	download: &KoboDownload,
	media_id: &str,
) -> Option<KoboPositionMap> {
	if !download.content.is_kepub {
		return None;
	}
	let cache_path = position_cache_path(config, media_id, &download.content.revision_id);
	if let Some(positions) = read_position_cache(&cache_path, media_id).await {
		return Some(positions);
	}

	let path = download.path.clone();
	match tokio::task::spawn_blocking(move || KoboPositionMap::from_path(path)).await {
		Ok(Ok(positions)) => {
			write_position_cache(&cache_path, media_id, &positions).await;
			Some(positions)
		},
		Ok(Err(error)) => {
			tracing::warn!(?error, %media_id, "Could not parse KEPUB positions");
			None
		},
		Err(error) => {
			tracing::warn!(?error, %media_id, "KEPUB position task failed");
			None
		},
	}
}

fn content_revision_from_parts(
	id: &str,
	size: i64,
	modified_at: Option<&str>,
	file_hash: Option<&str>,
	is_kepub: bool,
) -> String {
	let mut hasher = Sha256::new();
	hasher.update([CACHE_SCHEMA]);
	hasher.update(if is_kepub { b"kepub" } else { b"epub3" });
	for value in [
		id,
		&size.to_string(),
		modified_at.unwrap_or_default(),
		file_hash.unwrap_or_default(),
	] {
		hasher.update((value.len() as u64).to_le_bytes());
		hasher.update(value.as_bytes());
	}
	format!("{:x}", hasher.finalize())
}

fn kepub_cache_dir(config: &StumpConfig) -> PathBuf {
	config.get_cache_dir().join("kepub")
}

fn cache_book_key(media_id: &str) -> String {
	format!("{:x}", Sha256::digest(media_id.as_bytes()))
}

fn book_cache_dir(config: &StumpConfig, media_id: &str) -> PathBuf {
	kepub_cache_dir(config).join(cache_book_key(media_id))
}

fn kepub_cache_path(config: &StumpConfig, book: &media::Model) -> PathBuf {
	book_cache_dir(config, &book.id)
		.join(format!("{}.kepub.epub", content_revision(book, true)))
}

fn raw_marker_path(config: &StumpConfig, book: &media::Model) -> PathBuf {
	book_cache_dir(config, &book.id)
		.join(format!("{}.epub3", content_revision(book, false)))
}

fn position_cache_path(
	config: &StumpConfig,
	media_id: &str,
	revision_id: &str,
) -> PathBuf {
	book_cache_dir(config, media_id).join(format!("{revision_id}.positions.json"))
}

fn kepub_download(
	book: &media::Model,
	path: PathBuf,
	size: u64,
	guard: MutexGuard<'static, ()>,
) -> KoboDownload {
	KoboDownload {
		path,
		filename: kepub_filename(Path::new(&book.path)),
		content: KoboContentInfo {
			is_kepub: true,
			revision_id: content_revision(book, true),
			size,
		},
		_prepare_guard: guard,
	}
}

async fn source_download(
	book: &media::Model,
	guard: MutexGuard<'static, ()>,
) -> KoboDownload {
	let path = Path::new(&book.path);
	KoboDownload {
		path: path.to_path_buf(),
		filename: source_filename(path),
		content: KoboContentInfo {
			is_kepub: false,
			revision_id: content_revision(book, false),
			size: source_size(path, book.size).await,
		},
		_prepare_guard: guard,
	}
}

fn source_filename(path: &Path) -> String {
	path.file_name()
		.and_then(|name| name.to_str())
		.unwrap_or("book.epub")
		.to_string()
}

fn kepub_filename(path: &Path) -> String {
	if is_kepub_path(path) {
		return source_filename(path);
	}

	format!(
		"{}.kepub.epub",
		path.file_stem()
			.and_then(|name| name.to_str())
			.unwrap_or("book")
	)
}

async fn cache_entry_exists(path: &Path) -> bool {
	cache_entry_size(path).await.is_some()
}

async fn cache_entry_size(path: &Path) -> Option<u64> {
	match tokio::fs::metadata(path).await {
		Ok(metadata) if metadata.is_file() && metadata.len() > 0 => Some(metadata.len()),
		Ok(_) => None,
		Err(error) if error.kind() == std::io::ErrorKind::NotFound => None,
		Err(error) => {
			tracing::warn!(?error, ?path, "Could not inspect cached KEPUB");
			None
		},
	}
}

async fn source_size(path: &Path, fallback: i64) -> u64 {
	match tokio::fs::metadata(path).await {
		Ok(metadata) if metadata.is_file() => metadata.len(),
		Ok(_) => u64::try_from(fallback).unwrap_or(0),
		Err(error) => {
			tracing::warn!(?error, ?path, "Could not inspect Kobo source file size");
			u64::try_from(fallback).unwrap_or(0)
		},
	}
}

async fn record_raw_fallback(path: &Path) -> Result<(), KepubError> {
	let directory = path
		.parent()
		.expect("a KEPUB fallback marker always has a parent");
	tokio::fs::create_dir_all(directory)
		.await
		.map_err(KepubError::Cache)?;
	tokio::fs::write(path, b"raw")
		.await
		.map_err(KepubError::Cache)
}

async fn prune_book_cache(config: &StumpConfig, book: &media::Model) {
	let directory = book_cache_dir(config, &book.id);
	let keep = HashSet::from([
		format!("{}.kepub.epub", content_revision(book, true)),
		format!("{}.positions.json", content_revision(book, true)),
		format!("{}.epub3", content_revision(book, false)),
	]);
	let mut entries = match tokio::fs::read_dir(&directory).await {
		Ok(entries) => entries,
		Err(error) if error.kind() == std::io::ErrorKind::NotFound => return,
		Err(error) => {
			tracing::warn!(?error, ?directory, "Could not inspect KEPUB book cache");
			return;
		},
	};

	loop {
		let entry = match entries.next_entry().await {
			Ok(Some(entry)) => entry,
			Ok(None) => break,
			Err(error) => {
				tracing::warn!(?error, ?directory, "Could not scan KEPUB book cache");
				break;
			},
		};
		let name = entry.file_name().to_string_lossy().into_owned();
		if keep.contains(&name) {
			continue;
		}
		if entry.file_type().await.is_ok_and(|kind| kind.is_file()) {
			if let Err(error) = tokio::fs::remove_file(entry.path()).await {
				tracing::warn!(?error, path = ?entry.path(), "Could not prune stale KEPUB cache entry");
			}
		}
	}
}

/// Snapshots the cache directories which existed before the caller loads live media IDs.
/// Keeping the snapshot separate prevents a concurrently-created book from being pruned.
pub async fn cached_book_keys(config: &StumpConfig) -> Vec<String> {
	let directory = kepub_cache_dir(config);
	let mut entries = match tokio::fs::read_dir(&directory).await {
		Ok(entries) => entries,
		Err(error) if error.kind() == std::io::ErrorKind::NotFound => return vec![],
		Err(error) => {
			tracing::warn!(?error, ?directory, "Could not inspect KEPUB cache");
			return vec![];
		},
	};
	let mut keys = vec![];
	while let Ok(Some(entry)) = entries.next_entry().await {
		let name = entry.file_name().to_string_lossy().into_owned();
		if entry.file_type().await.is_ok_and(|kind| kind.is_dir())
			&& name.len() == 64
			&& name.bytes().all(|byte| byte.is_ascii_hexdigit())
		{
			keys.push(name);
		}
	}
	keys
}

pub async fn prune_deleted_cache(
	config: &StumpConfig,
	cached_book_keys: &[String],
	live_media_ids: &[String],
) {
	let live_keys: HashSet<String> =
		live_media_ids.iter().map(|id| cache_book_key(id)).collect();
	let directory = kepub_cache_dir(config);
	for key in cached_book_keys {
		if live_keys.contains(key) {
			continue;
		}
		let lock_index = key
			.get(..2)
			.and_then(|prefix| u8::from_str_radix(prefix, 16).ok())
			.map_or(0, usize::from)
			% PREPARE_LOCK_COUNT;
		let _guard = PREPARE_LOCKS[lock_index].lock().await;
		let path = directory.join(key);
		if let Err(error) = tokio::fs::remove_dir_all(&path).await {
			if error.kind() != std::io::ErrorKind::NotFound {
				tracing::warn!(?error, ?path, "Could not prune deleted-book KEPUB cache");
			}
		}
	}
}

async fn read_position_cache(path: &Path, media_id: &str) -> Option<KoboPositionMap> {
	let bytes = match tokio::fs::read(path).await {
		Ok(bytes) => bytes,
		Err(error) if error.kind() == std::io::ErrorKind::NotFound => return None,
		Err(error) => {
			tracing::warn!(?error, %media_id, ?path, "Could not read cached KEPUB positions");
			return None;
		},
	};
	match serde_json::from_slice(&bytes) {
		Ok(positions) => Some(positions),
		Err(error) => {
			tracing::warn!(?error, %media_id, ?path, "Could not parse cached KEPUB positions");
			None
		},
	}
}

async fn write_position_cache(path: &Path, media_id: &str, positions: &KoboPositionMap) {
	let bytes = match serde_json::to_vec(positions) {
		Ok(bytes) => bytes,
		Err(error) => {
			tracing::warn!(?error, %media_id, "Could not serialize KEPUB positions");
			return;
		},
	};
	let Some(directory) = path.parent() else {
		return;
	};
	if let Err(error) = tokio::fs::create_dir_all(directory).await {
		tracing::warn!(?error, %media_id, ?directory, "Could not create KEPUB position cache");
		return;
	}
	if let Err(error) = tokio::fs::write(path, bytes).await {
		tracing::warn!(?error, %media_id, ?path, "Could not cache KEPUB positions");
	}
}

async fn converter() -> Option<&'static Kepubify> {
	KEPUBIFY
		.get_or_init(|| async {
			let command = OsString::from("kepubify");
			let mut probe = Command::new(&command);
			probe.arg("--version").kill_on_drop(true);
			let output = timeout(CONVERSION_TIMEOUT, probe.output())
				.await
				.ok()?
				.ok()?;
			if !output.status.success() {
				return None;
			}

			let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
			tracing::info!(%version, "Found kepubify");
			Some(Kepubify { command, version })
		})
		.await
		.as_ref()
}

async fn convert_and_cache(
	kepubify: &Kepubify,
	source_path: &Path,
	cache_path: &Path,
) -> Result<(), KepubError> {
	let cache_dir = cache_path
		.parent()
		.expect("a KEPUB cache path always has a parent");
	tokio::fs::create_dir_all(cache_dir)
		.await
		.map_err(KepubError::Cache)?;

	let temp_dir = Builder::new()
		.prefix(".kepub-")
		.tempdir_in(cache_dir)
		.map_err(KepubError::Cache)?;
	let temp_output = temp_dir.path().join("book.kepub.epub");

	let mut command = Command::new(&kepubify.command);
	command
		.arg(source_path)
		.arg("-o")
		.arg(&temp_output)
		.kill_on_drop(true);

	let output = timeout(CONVERSION_TIMEOUT, command.output())
		.await
		.map_err(|_| KepubError::Timeout)?
		.map_err(KepubError::Start)?;

	if !output.status.success() {
		return Err(KepubError::ConversionFailed {
			status: output.status,
			stderr: String::from_utf8_lossy(&output.stderr)
				.trim()
				.chars()
				.take(512)
				.collect(),
		});
	}

	if !cache_entry_exists(&temp_output).await {
		return Err(KepubError::MissingOutput);
	}

	if let Err(error) = tokio::fs::rename(&temp_output, cache_path).await {
		// Another request may have won the conversion race, notably on Windows where
		// rename does not replace an existing destination.
		if !cache_entry_exists(cache_path).await {
			return Err(KepubError::Cache(error));
		}
	}

	tracing::debug!(
		converter_version = %kepubify.version,
		?cache_path,
		"Cached converted KEPUB"
	);
	Ok(())
}

#[cfg(test)]
mod tests {
	use chrono::Utc;
	use models::shared::enums::FileStatus;

	use super::*;

	fn test_book(id: &str, path: &Path) -> media::Model {
		media::Model {
			id: id.to_string(),
			name: id.to_string(),
			size: 999,
			extension: "epub".to_string(),
			pages: 1,
			updated_at: None,
			created_at: Utc::now().into(),
			modified_at: None,
			hash: None,
			koreader_hash: None,
			path: path.to_string_lossy().into_owned(),
			status: FileStatus::Ready,
			thumbnail_meta: None,
			thumbnail_path: None,
			series_id: None,
			deleted_at: None,
		}
	}

	fn test_config(directory: &Path) -> StumpConfig {
		let mut config = StumpConfig::debug();
		config.config_dir = directory.to_string_lossy().into_owned();
		config
	}

	#[cfg(unix)]
	fn fake_converter(directory: &Path, script: &str) -> Kepubify {
		use std::os::unix::fs::PermissionsExt;

		let path = directory.join("kepubify");
		std::fs::write(&path, script).expect("fake converter should be written");
		std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o755))
			.expect("fake converter should be executable");
		Kepubify {
			command: path.into_os_string(),
			version: "test".to_string(),
		}
	}

	#[test]
	fn detects_preconverted_kepub_names() {
		assert!(is_kepub_path("book.kepub.epub"));
		assert!(is_kepub_path("BOOK.KEPUB.EPUB"));
		assert!(!is_kepub_path("book.epub"));
		assert!(!is_kepub_path("kepub.epub.zip"));
	}

	#[test]
	fn content_revision_is_stable_and_format_specific() {
		let first = content_revision_from_parts(
			"book-1",
			42,
			Some("2024-01-01T00:00:00Z"),
			Some("hash"),
			true,
		);
		let same = content_revision_from_parts(
			"book-1",
			42,
			Some("2024-01-01T00:00:00Z"),
			Some("hash"),
			true,
		);
		let raw = content_revision_from_parts(
			"book-1",
			42,
			Some("2024-01-01T00:00:00Z"),
			Some("hash"),
			false,
		);
		let changed = content_revision_from_parts(
			"book-1",
			43,
			Some("2024-01-01T00:00:00Z"),
			Some("hash"),
			true,
		);

		assert_eq!(first, same);
		assert_ne!(first, raw);
		assert_ne!(first, changed);
		assert_eq!(first.len(), 64);
	}

	#[test]
	fn produces_kepub_download_name() {
		assert_eq!(
			kepub_filename(Path::new("A Book.epub")),
			"A Book.kepub.epub"
		);
		assert_eq!(
			kepub_filename(Path::new("A Book.kepub.epub")),
			"A Book.kepub.epub"
		);
	}

	#[cfg(unix)]
	#[tokio::test]
	async fn caches_fake_converter_output_atomically() {
		let directory = tempfile::tempdir().expect("temporary directory");
		let source = directory.path().join("book.epub");
		let cache = directory.path().join("cache/revision.kepub.epub");
		tokio::fs::write(&source, b"converted bytes")
			.await
			.expect("source should be written");
		let converter = fake_converter(directory.path(), "#!/bin/sh\ncp \"$1\" \"$3\"\n");

		convert_and_cache(&converter, &source, &cache)
			.await
			.expect("conversion should succeed");

		assert!(cache_entry_exists(&cache).await);
		assert_eq!(
			tokio::fs::read(&cache).await.expect("cache should be read"),
			b"converted bytes"
		);
	}

	#[cfg(unix)]
	#[tokio::test]
	async fn reports_fake_converter_failure_without_cache_entry() {
		let directory = tempfile::tempdir().expect("temporary directory");
		let source = directory.path().join("book.epub");
		let cache = directory.path().join("cache/revision.kepub.epub");
		tokio::fs::write(&source, b"source")
			.await
			.expect("source should be written");
		let converter = fake_converter(directory.path(), "#!/bin/sh\nexit 7\n");

		let error = convert_and_cache(&converter, &source, &cache)
			.await
			.expect_err("conversion should fail");

		assert!(matches!(error, KepubError::ConversionFailed { .. }));
		assert!(!cache_entry_exists(&cache).await);
	}

	#[cfg(unix)]
	#[tokio::test]
	async fn keeps_failed_revision_raw_and_reports_artifact_sizes() {
		let directory = tempfile::tempdir().expect("temporary directory");
		let source = directory.path().join("book.epub");
		tokio::fs::write(&source, b"source")
			.await
			.expect("source should be written");
		let config = test_config(directory.path());
		let book = test_book("failed-book", &source);
		let failed = fake_converter(directory.path(), "#!/bin/sh\nexit 7\n");

		let first = prepare_download_with_converter(&config, &book, Some(&failed))
			.await
			.expect("raw fallback should be recorded");
		assert!(!first.content.is_kepub);
		assert_eq!(first.content.size, 6);
		assert!(cache_entry_exists(&raw_marker_path(&config, &book)).await);
		drop(first);

		let working = fake_converter(
			directory.path(),
			"#!/bin/sh\nprintf 'converted artifact' > \"$3\"\n",
		);
		let second = prepare_download_with_converter(&config, &book, Some(&working))
			.await
			.expect("recorded raw fallback should be used");
		assert!(!second.content.is_kepub);
		assert_eq!(second.path, source);
		assert!(!cache_entry_exists(&kepub_cache_path(&config, &book)).await);
		drop(second);

		let converted_source = directory.path().join("converted.epub");
		tokio::fs::write(&converted_source, b"source")
			.await
			.expect("source should be written");
		let converted_book = test_book("converted-book", &converted_source);
		let converted =
			prepare_download_with_converter(&config, &converted_book, Some(&working))
				.await
				.expect("conversion should succeed");
		assert!(converted.content.is_kepub);
		assert_eq!(converted.content.size, 18);
	}

	#[cfg(unix)]
	#[tokio::test]
	async fn rejects_an_unrecorded_raw_fallback() {
		let directory = tempfile::tempdir().expect("temporary directory");
		let source = directory.path().join("book.epub");
		tokio::fs::write(&source, b"source").await.unwrap();
		let config = test_config(directory.path());
		let book = test_book("unwritable-fallback", &source);
		tokio::fs::create_dir_all(kepub_cache_dir(&config))
			.await
			.unwrap();
		tokio::fs::write(book_cache_dir(&config, &book.id), b"not a directory")
			.await
			.unwrap();
		let failed = fake_converter(directory.path(), "#!/bin/sh\nexit 7\n");

		let result = prepare_download_with_converter(&config, &book, Some(&failed)).await;

		assert!(matches!(result, Err(KepubError::Cache(_))));
	}

	#[tokio::test]
	async fn prunes_only_deleted_books_from_the_cache_snapshot() {
		let directory = tempfile::tempdir().expect("temporary directory");
		let config = test_config(directory.path());
		for id in ["live", "deleted"] {
			tokio::fs::create_dir_all(book_cache_dir(&config, id))
				.await
				.unwrap();
		}
		let snapshot = cached_book_keys(&config).await;
		tokio::fs::create_dir_all(book_cache_dir(&config, "created-during-prune"))
			.await
			.unwrap();

		prune_deleted_cache(&config, &snapshot, &["live".to_string()]).await;

		assert!(book_cache_dir(&config, "live").is_dir());
		assert!(!book_cache_dir(&config, "deleted").exists());
		assert!(book_cache_dir(&config, "created-during-prune").is_dir());
	}

	#[tokio::test]
	async fn pruning_waits_for_prepared_downloads() {
		let directory = tempfile::tempdir().expect("temporary directory");
		let source = directory.path().join("book.epub");
		tokio::fs::write(&source, b"source").await.unwrap();
		let config = test_config(directory.path());
		let book = test_book("in-flight", &source);
		tokio::fs::create_dir_all(book_cache_dir(&config, &book.id))
			.await
			.unwrap();
		let snapshot = cached_book_keys(&config).await;
		let download = prepare_download_with_converter(&config, &book, None)
			.await
			.unwrap();
		assert!(!cache_entry_exists(&raw_marker_path(&config, &book)).await);
		let prune = prune_deleted_cache(&config, &snapshot, &[]);
		tokio::pin!(prune);

		assert!(tokio::time::timeout(Duration::from_millis(20), &mut prune)
			.await
			.is_err());
		drop(download);
		tokio::time::timeout(Duration::from_secs(1), prune)
			.await
			.expect("prune should resume after the download is prepared");
	}

	#[tokio::test]
	async fn caches_position_maps() {
		let directory = tempfile::tempdir().expect("temporary directory");
		let path = directory.path().join("positions.json");
		let positions = KoboPositionMap::default();

		write_position_cache(&path, "book", &positions).await;

		assert_eq!(read_position_cache(&path, "book").await, Some(positions));
	}
}
