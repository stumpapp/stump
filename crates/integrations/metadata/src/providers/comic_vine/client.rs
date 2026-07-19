use http_cache_reqwest::{Cache, CacheMode, HttpCache, HttpCacheOptions, MokaManager};
use reqwest::Url;
use reqwest_middleware::{ClientBuilder, ClientWithMiddleware};

use crate::{
	client::{build_client_with_retry, RetryClientConfig},
	error::MetadataProviderError,
	provider::ProviderCredentialVerification,
	providers::comic_vine::utils::{
		extract_issue_id, filled_array_or_none, parse_date_parts,
	},
	types::{
		ExternalMediaMetadata, ExternalSeriesMetadata, MatchCandidate, MediaType,
		SearchQuery,
	},
	ExternalMetadata, MetadataProvider, RateLimiter,
};

use super::{
	types::{
		ComicVinePrefix, ComicVineResponse, IssueDetail, IssueResult, VolumeDetail,
		VolumeResult,
	},
	utils::filter_credits_by_role,
};

/// The official rate limit is 200 req/hour (see https://comicvine.gamespot.com/api/).
/// Honestly that is quite low. I chose 1 req/sec to be a bit more cautious, but
/// that will easily exceed the hourly limit for even small libraries
const COMIC_VINE_DEFAULT_RATE_LIMIT: u32 = 1;

pub struct ComicVineClient {
	client: ClientWithMiddleware,
	api_key: String,
	rate_limiter: RateLimiter,
}

impl ComicVineClient {
	const API_URL: &'static str = "https://comicvine.gamespot.com/api";

	pub fn new(api_key: String, rate_limit: Option<u32>) -> Self {
		let inner = reqwest::Client::builder()
			// comic vine requires a user-agent, rejects with a 403. ask me how i know
			.user_agent(concat!(
				env!("CARGO_PKG_NAME"),
				"/",
				env!("CARGO_PKG_VERSION")
			))
			.build()
			.expect("Failed to build ComicVine HTTP client"); // this should never really happen
		let with_retry = build_client_with_retry(inner, RetryClientConfig::default());

		let with_cache = ClientBuilder::from_client(with_retry)
			.with(
				// the rec in their api docs is to cache responses becaues of the low rate limit
				Cache(HttpCache {
					mode: CacheMode::Default,
					manager: MokaManager::default(),
					options: HttpCacheOptions::default(),
				}),
			)
			.build();

		Self {
			client: with_cache,
			api_key,
			rate_limiter: RateLimiter::new(
				rate_limit.unwrap_or(COMIC_VINE_DEFAULT_RATE_LIMIT),
			),
		}
	}

	/// Send a GET request to the ComicVine API
	///
	/// - `path` should start with a `/`, e.g. `/volumes/`.
	/// - `params` are appended as additional query parameters
	async fn get<T: serde::de::DeserializeOwned>(
		&self,
		path: &str,
		params: &[(&str, &str)],
	) -> Result<T, MetadataProviderError> {
		self.rate_limiter.until_ready().await;

		let mut url = Url::parse(&format!("{}{}", Self::API_URL, path))
			.map_err(|e| MetadataProviderError::Other(format!("Invalid URL: {}", e)))?;

		url.query_pairs_mut()
			.append_pair("api_key", &self.api_key)
			.append_pair("format", "json");

		for (k, v) in params {
			url.query_pairs_mut().append_pair(k, v);
		}

		let response = self.client.get(url).send().await?.error_for_status()?;
		let data: ComicVineResponse<T> = response.json().await?;

		if data.status_code != 1 {
			return Err(MetadataProviderError::Other(format!(
				"ComicVine API error (code {}): {}",
				data.status_code, data.error
			)));
		}

		data.results.ok_or(MetadataProviderError::EmptyResponse)
	}

	#[tracing::instrument(skip(self))]
	async fn search_volumes(
		&self,
		query: &str,
		limit: u32,
	) -> Result<Vec<VolumeResult>, MetadataProviderError> {
		let limit_str = limit.to_string();
		let params = [
			("query", query),
			("resources", "volume"),
			(
				"field_list",
				"id,name,description,start_year,publisher,image,count_of_issues,deck",
			),
			("limit", limit_str.as_str()),
		];
		self.get::<Vec<VolumeResult>>("/search/", &params).await
	}

	#[tracing::instrument(skip(self))]
	async fn search_issues(
		&self,
		query: &str,
		limit: u32,
	) -> Result<Vec<IssueResult>, MetadataProviderError> {
		let limit_str = limit.to_string();
		let params = [
			("query", query),
			("resources", "issue"),
			("field_list", "id,name,description,issue_number,volume,cover_date,image,person_credits,character_credits"),
			("limit", limit_str.as_str()),
		];
		self.get::<Vec<IssueResult>>("/search/", &params).await
	}

	async fn fetch_volume(
		&self,
		id: &str,
	) -> Result<VolumeDetail, MetadataProviderError> {
		let params = [(
			"field_list",
			"id,name,description,start_year,publisher,image,count_of_issues,people,issues",
		)];
		self.get::<VolumeDetail>(
			&format!("/volume/{}-{}/", u32::from(ComicVinePrefix::Volume), id),
			&params,
		)
		.await
	}

	async fn fetch_issue(&self, id: &str) -> Result<IssueDetail, MetadataProviderError> {
		let params = [(
			"field_list",
			"id,name,description,issue_number,volume,cover_date,image,person_credits,character_credits",
		)];
		self.get::<IssueDetail>(
			&format!("/issue/{}-{}/", u32::from(ComicVinePrefix::Issue), id),
			&params,
		)
		.await
	}

	/// Attempt a direct issue lookup using the `comic_vine_volume_id` provider hint, if present
	async fn try_hint_issue_lookup(&self, query: &SearchQuery) -> Option<MatchCandidate> {
		let volume_id = query.provider_hints.get("comic_vine_volume_id")?;
		let number = query.number?;

		let volume = match self.fetch_volume(volume_id).await {
			Ok(v) => v,
			Err(e) => {
				tracing::warn!(
					volume_id,
					error = ?e,
					"Volume fetch via hint failed, falling back to search"
				);
				return None;
			},
		};

		let issue_id = extract_issue_id(&volume.issues?, number)?;

		match self.fetch_media_metadata(&issue_id).await {
			Ok(metadata) => Some(MatchCandidate {
				external_id: issue_id,
				metadata: ExternalMetadata::Media(metadata),
				provider: self.id().to_string(),
				confidence: 1.0,
				confidence_factors: Vec::new(),
			}),
			Err(e) => {
				tracing::warn!(
					issue_id = issue_id,
					error = ?e,
					"Direct issue fetch via hint failed, falling back to search"
				);
				None
			},
		}
	}
}

#[async_trait::async_trait]
impl MetadataProvider for ComicVineClient {
	fn id(&self) -> &'static str {
		"comic_vine"
	}

	fn name(&self) -> &'static str {
		"ComicVine"
	}

	fn supported_media_types(&self) -> Vec<MediaType> {
		vec![MediaType::Comic]
	}

	#[tracing::instrument(skip(self))]
	async fn search_series(
		&self,
		query: &SearchQuery,
	) -> Result<Vec<MatchCandidate>, MetadataProviderError> {
		// happy path
		if let Some(volume_id) = query.provider_hints.get("comic_vine_volume_id") {
			tracing::debug!(
				volume_id,
				"Using comic_vine_volume_id hint for direct fetch"
			);
			match self.fetch_series_metadata(volume_id).await {
				Ok(metadata) => {
					return Ok(vec![MatchCandidate {
						external_id: volume_id.clone(),
						metadata: ExternalMetadata::Series(metadata),
						provider: self.id().to_string(),
						confidence: 1.0,
						confidence_factors: Vec::new(),
					}]);
				},
				Err(e) => {
					// TODO: i think this would warrant a persisted log, since unless the request was just
					// rate limited or a spurious network error happened, it would indicate the id stored is
					// not valid
					tracing::warn!(
						volume_id,
						error = ?e,
						"Direct volume fetch via hint failed, falling back to search"
					);
				},
			}
		}

		tracing::trace!("Searching for volumes on ComicVine");
		let results = self
			.search_volumes(&query.title, query.limit.unwrap_or(10))
			.await?;

		let mut candidates = Vec::with_capacity(results.len());
		for result in results {
			let external_id = result.id.to_string();
			match self.fetch_series_metadata(&external_id).await {
				Ok(metadata) => {
					tracing::trace!(external_id, "Fetched volume metadata successfully");
					candidates.push(MatchCandidate {
						external_id,
						metadata: ExternalMetadata::Series(metadata),
						provider: self.id().to_string(),
						confidence: 0.0,
						confidence_factors: Vec::new(),
					});
				},
				Err(e) => {
					tracing::error!(
						external_id,
						error = ?e,
						"Failed to fetch volume metadata for search result"
					);
				},
			}
		}

		Ok(self.score_search(query, candidates))
	}

	#[tracing::instrument(skip(self))]
	async fn search_media(
		&self,
		query: &SearchQuery,
	) -> Result<Vec<MatchCandidate>, MetadataProviderError> {
		// happy path
		if let Some(candidate) = self.try_hint_issue_lookup(query).await {
			return Ok(vec![candidate]);
		}

		tracing::trace!("Searching for issues on ComicVine");
		let results = self
			.search_issues(&query.title, query.limit.unwrap_or(10))
			.await?;

		let mut candidates = Vec::with_capacity(results.len());
		for result in results {
			let external_id = result.id.to_string();
			match self.fetch_media_metadata(&external_id).await {
				Ok(metadata) => {
					tracing::trace!(external_id, "Fetched issue metadata successfully");
					candidates.push(MatchCandidate {
						external_id,
						metadata: ExternalMetadata::Media(metadata),
						provider: self.id().to_string(),
						confidence: 0.0,
						confidence_factors: Vec::new(),
					});
				},
				Err(e) => {
					// TODO: persisted log?
					tracing::error!(
						external_id,
						error = ?e,
						"Failed to fetch issue metadata for search result"
					);
				},
			}
		}

		Ok(self.score_search(query, candidates))
	}

	async fn fetch_series_metadata(
		&self,
		external_id: &str,
	) -> Result<ExternalSeriesMetadata, MetadataProviderError> {
		let volume = self.fetch_volume(external_id).await?;

		let people = volume.people.unwrap_or_default();
		let authors = filter_credits_by_role(&people, &["writer"]);
		// i took the largest one, but perhaps that isn't ideal. i think it's probably fine
		let cover_url = volume.image.and_then(|img| img.super_url);

		Ok(ExternalSeriesMetadata {
			provider: self.id().to_string(),
			external_id: volume.id.to_string(),
			title: volume.name.unwrap_or_default(),
			alternative_titles: vec![],
			summary: volume.deck.or(volume.description),
			year: volume.start_year.and_then(|y| y.parse().ok()),
			publisher: volume.publisher.and_then(|p| p.name),
			authors: filled_array_or_none(authors),
			volume_count: volume.count_of_issues,
			cover_url,
			..Default::default()
		})
	}

	async fn fetch_media_metadata(
		&self,
		external_id: &str,
	) -> Result<ExternalMediaMetadata, MetadataProviderError> {
		let issue = self.fetch_issue(external_id).await?;

		let cover_url = issue.image.and_then(|img| img.super_url);

		let number = issue
			.issue_number
			.as_deref()
			.and_then(|n| n.parse::<f32>().ok());

		let (year, month, day) = issue
			.cover_date
			.as_deref()
			.map(parse_date_parts)
			.unwrap_or((None, None, None));

		let credits = issue.person_credits.unwrap_or_default();
		let writers =
			filter_credits_by_role(&credits, &["writer", "plotter", "scripter"]);
		let artists = filter_credits_by_role(
			&credits,
			&["penciler", "penciller", "breakdowns", "inker", "finishes"],
		);
		let colorists = filter_credits_by_role(
			&credits,
			&["colorist", "colourist", "colorer", "colourer"],
		);
		let letterers = filter_credits_by_role(&credits, &["letterer"]);
		let cover_artists =
			filter_credits_by_role(&credits, &["cover", "coverartist", "cover artist"]);

		let series_name = issue.volume.as_ref().and_then(|v| v.name.clone());
		let series_external_id = issue.volume.as_ref().map(|v| v.id.to_string());

		Ok(ExternalMediaMetadata {
			provider: self.id().to_string(),
			external_id: issue.id.to_string(),
			title: issue.name,
			summary: issue.description,
			number,
			series_name,
			series_external_id,
			year,
			month,
			day,
			writers: filled_array_or_none(writers),
			artists: filled_array_or_none(artists),
			colorists: filled_array_or_none(colorists),
			letterers: filled_array_or_none(letterers),
			cover_artists: filled_array_or_none(cover_artists),
			cover_url,
			provider_url: Some(format!(
				"https://comicvine.gamespot.com/issue/{}-{}/",
				u32::from(ComicVinePrefix::Issue),
				external_id
			)),
			..Default::default()
		})
	}

	#[tracing::instrument(skip(self))]
	async fn verify_credentials(
		&self,
	) -> Result<ProviderCredentialVerification, MetadataProviderError> {
		let mut url = Url::parse("https://comicvine.gamespot.com/api/characters/")
			.map_err(|e| MetadataProviderError::Other(format!("Invalid URL: {}", e)))?;

		url.query_pairs_mut()
			.append_pair("api_key", &self.api_key)
			.append_pair("format", "json");

		let response = self.client.get(url).send().await?.error_for_status()?;
		let response_status = response.status().as_u16();
		// don't care about actual data, so used serde_json::Value as catch-all
		let data: ComicVineResponse<serde_json::Value> = response.json().await?;

		// sometimes data.error would be "OK" which is kinda annoying, so we only check status code here
		if data.status_code != 1 {
			return Ok(ProviderCredentialVerification {
				is_valid: false,
				response_status,
				error: Some(data.error),
			});
		}

		Ok(ProviderCredentialVerification {
			is_valid: true,
			response_status,
			error: None,
		})
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	fn get_test_client() -> ComicVineClient {
		dotenvy::dotenv().ok();
		let api_key =
			std::env::var("COMIC_VINE_API_KEY").expect("COMIC_VINE_API_KEY not set");
		ComicVineClient::new(api_key, None)
	}

	#[ignore = "Requires COMIC_VINE_API_KEY env var"]
	#[tokio::test]
	async fn test_search_series() {
		let client = get_test_client();
		let query = SearchQuery {
			title: "Superior Spider-Man".to_string(),
			limit: Some(5),
			..Default::default()
		};

		let results = client.search_series(&query).await;
		assert!(results.is_ok(), "should have been ok: {:?}", results);

		let candidates = results.unwrap();
		assert!(
			!candidates.is_empty(),
			"should have gotten at least one: {:?}",
			candidates
		);
	}

	#[ignore = "Requires COMIC_VINE_API_KEY env var"]
	#[tokio::test]
	async fn test_search_media() {
		let client = get_test_client();
		let query = SearchQuery {
			title: "Superior Spider-Man 001".to_string(),
			limit: Some(5),
			..Default::default()
		};

		let results = client.search_media(&query).await;
		println!("search_media results: {:#?}", results);
		assert!(results.is_ok());
	}

	#[ignore = "Requires COMIC_VINE_API_KEY env var"]
	#[tokio::test]
	async fn test_verify_credentials() {
		let client = get_test_client();
		let verification = client.verify_credentials().await;
		assert!(verification.is_ok());
		assert!(verification.unwrap().is_valid);
	}
}
