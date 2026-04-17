use chrono::Datelike;
use reqwest_middleware::ClientWithMiddleware;
use serde::Deserialize;

use crate::{
	client::{build_client_with_retry, RetryClientConfig},
	error::MetadataProviderError,
	serde_utils::string_or_number,
	types::{
		ExternalMediaMetadata, ExternalSeriesMetadata, MatchCandidate, MediaType,
		SearchQuery,
	},
	ExternalMetadata, MetadataProvider, RateLimiter,
};

const HARDCOVER_DEFAULT_RATE_LIMIT: u32 = 5;

pub struct HardcoverClient {
	client: ClientWithMiddleware,
	api_token: Option<String>,
	rate_limiter: RateLimiter,
}

/// Object types supported by Hardcover's search API
/// See: https://docs.hardcover.app/api/guides/searching/
#[derive(Debug, Clone, Copy)]
pub enum HardcoverSearchType {
	Book,
	Series,
}

impl HardcoverSearchType {
	fn as_str(&self) -> &'static str {
		match self {
			Self::Book => "Book",
			Self::Series => "Series",
		}
	}
}

impl HardcoverClient {
	const API_URL: &'static str = "https://api.hardcover.app/v1/graphql";

	pub fn new(api_token: String, rate_limit: Option<u32>) -> Self {
		Self {
			client: build_client_with_retry(
				reqwest::Client::new(),
				RetryClientConfig::default(),
			),
			api_token: Some(api_token),
			rate_limiter: RateLimiter::new(
				rate_limit.unwrap_or(HARDCOVER_DEFAULT_RATE_LIMIT),
			),
		}
	}

	pub fn token(&self) -> Result<String, MetadataProviderError> {
		self.api_token
			.clone()
			.ok_or(MetadataProviderError::MissingToken)
	}

	async fn execute_graphql<T: serde::de::DeserializeOwned>(
		&self,
		query: &str,
	) -> Result<T, MetadataProviderError> {
		let token = self.token()?;
		self.rate_limiter.until_ready().await;

		let body = serde_json::json!({ "query": query });

		let response = self
			.client
			.post(Self::API_URL)
			.bearer_auth(token)
			.json(&body)
			.send()
			.await?
			.error_for_status()?
			.json::<GraphQLResponse<T>>()
			.await?;

		if let Some(errors) = response.errors {
			if !errors.is_empty() {
				let messages: Vec<_> =
					errors.iter().map(|e| e.message.as_str()).collect();
				return Err(MetadataProviderError::Other(format!(
					"GraphQL errors: {}",
					messages.join("; ")
				)));
			}
		}

		response.data.ok_or(MetadataProviderError::EmptyResponse)
	}

	#[tracing::instrument(skip(self))]
	async fn search(
		&self,
		query: &str,
		query_type: HardcoverSearchType,
		limit: u32,
	) -> Result<SearchResponse, MetadataProviderError> {
		let sanitized_query = query
			.replace('\\', "\\\\")
			.replace('"', "\\\"")
			.replace(['\n', '\r', '\t'], " ");
		let graphql_query = format!(
			r#"query Search {{ search(query: "{}", query_type: "{}", per_page: {}) {{ results }} }}"#,
			sanitized_query,
			query_type.as_str(),
			limit,
		);
		tracing::trace!(?graphql_query, "Searching Hardcover...");
		dbg!(&graphql_query);

		let data: SearchData = self.execute_graphql(&graphql_query).await?;
		Ok(data.search)
	}

	async fn fetch_series(&self, id: i64) -> Result<SeriesDetail, MetadataProviderError> {
		let graphql_query = format!(
			r#"query GetSeries {{
				series(where: {{ id: {{ _eq: {} }} }}) {{
					id
					slug
					name
					description
					books_count
					author {{
						id
						name
						slug
					}}
				}}
			}}"#,
			id
		);

		let data: SeriesQueryData = self.execute_graphql(&graphql_query).await?;
		data.series
			.into_iter()
			.next()
			.ok_or_else(|| MetadataProviderError::NotFound(format!("Series {}", id)))
	}

	async fn fetch_book(&self, id: i64) -> Result<BookDetail, MetadataProviderError> {
		let graphql_query = format!(
			r#"query GetBook {{
				books(where: {{ id: {{ _eq: {} }} }}) {{
					id
					slug
					title
					subtitle
					description
					release_year
					release_date
					pages
					cached_image
					cached_contributors
					cached_tags
					featured_book_series {{
						position
						series {{
							name
						}}
					}}
					featured_book_series_id
					default_physical_edition {{
						isbn_10
						isbn_13
					}}
				}}
			}}"#,
			id
		);

		let data: BookQueryData = self.execute_graphql(&graphql_query).await?;
		data.books
			.into_iter()
			.next()
			.ok_or_else(|| MetadataProviderError::NotFound(format!("Book {}", id)))
	}
}

#[async_trait::async_trait]
impl MetadataProvider for HardcoverClient {
	fn id(&self) -> &'static str {
		"hardcover"
	}

	fn name(&self) -> &'static str {
		"Hardcover"
	}

	fn supported_media_types(&self) -> Vec<MediaType> {
		vec![MediaType::Book]
	}

	/// Search for series on Hardcover and fetch full metadata for each result
	/// See: https://docs.hardcover.app/api/guides/searching/#series
	async fn search_series(
		&self,
		query: &SearchQuery,
	) -> Result<Vec<MatchCandidate>, MetadataProviderError> {
		tracing::trace!("Searching for series on Hardcover");
		let response = self
			.search(
				&query.title,
				HardcoverSearchType::Series,
				query.limit.unwrap_or(10),
			)
			.await?;

		let hits = response.parse_series_hits()?;

		// TODO: Parallelize these fetches
		let mut candidates = Vec::with_capacity(hits.len());
		for hit in hits {
			let external_id = hit.document.id;
			match self.fetch_series_metadata(&external_id).await {
				Ok(metadata) => {
					tracing::trace!(external_id, "Fetched series metadata successfully");
					candidates.push(MatchCandidate {
						external_id,
						metadata: ExternalMetadata::Series(metadata),
						provider: self.id().to_string(),
						confidence: 0.0,
						confidence_factors: Vec::new(),
					})
				},
				Err(e) => {
					// TODO: Maybe if fetch fails, use naive meta from search?
					// A full skip failure feels wasteful? Idk, it's a complicated feature
					tracing::error!(
						external_id,
						error = ?e,
						"Failed to fetch series metadata for search result"
					);
				},
			}
		}

		Ok(self.score_search(query, candidates))
	}

	/// Search for books on Hardcover and fetch full metadata for each result
	/// See: https://docs.hardcover.app/api/guides/searching/#books
	#[tracing::instrument(skip(self))]
	async fn search_media(
		&self,
		query: &SearchQuery,
	) -> Result<Vec<MatchCandidate>, MetadataProviderError> {
		let response = self
			.search(
				&query.title,
				HardcoverSearchType::Book,
				query.limit.unwrap_or(10),
			)
			.await?;

		let hits = response.parse_book_hits()?;

		// TODO: Parallelize these fetches
		let mut candidates = Vec::with_capacity(hits.len());
		for hit in hits {
			let external_id = hit.document.id;
			match self.fetch_media_metadata(&external_id).await {
				Ok(metadata) => {
					tracing::trace!(external_id, "Fetched book metadata successfully");
					candidates.push(MatchCandidate {
						external_id,
						metadata: ExternalMetadata::Media(metadata),
						provider: self.id().to_string(),
						confidence: 0.0,
						confidence_factors: Vec::new(),
					});
				},
				Err(e) => {
					// TODO: Maybe if fetch fails, use naive meta from search?
					// A full skip failure feels wasteful? Idk, it's a complicated feature
					tracing::error!(
						external_id,
						error = ?e,
						"Failed to fetch book metadata for search result"
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
		let id: i64 = external_id.parse().map_err(|_| {
			MetadataProviderError::Other(format!("Invalid series ID: {}", external_id))
		})?;

		let series = self.fetch_series(id).await?;

		let authors: Vec<String> =
			series.author.and_then(|a| a.name).into_iter().collect();

		Ok(ExternalSeriesMetadata {
			provider: self.id().to_string(),
			external_id: series.id.to_string(),
			title: series.name.unwrap_or_default(),
			alternative_titles: vec![],
			summary: series.description,
			authors: Some(authors),
			volume_count: series.books_count,
			..Default::default()
		})
	}

	async fn fetch_media_metadata(
		&self,
		external_id: &str,
	) -> Result<ExternalMediaMetadata, MetadataProviderError> {
		let id: i64 = external_id.parse().map_err(|_| {
			MetadataProviderError::Other(format!("Invalid book ID: {}", external_id))
		})?;

		let book = self.fetch_book(id).await?;

		let writers: Vec<String> = book
			.cached_contributors
			.as_ref()
			.and_then(|v| v.as_array())
			.map(|arr| {
				arr.iter()
					.filter_map(|c| {
						let contribution = c.get("contribution")?.as_str()?;
						if contribution == "Author" || contribution == "Writer" {
							c.get("author")?
								.get("name")?
								.as_str()
								.map(|s| s.to_string())
						} else {
							None
						}
					})
					.collect()
			})
			.unwrap_or_default();

		let cover_url = book
			.cached_image
			.as_ref()
			.and_then(|img| img.get("url"))
			.and_then(|v| v.as_str())
			.map(|s| s.to_string());

		let number = book
			.featured_book_series
			.as_ref()
			.and_then(|fbs| fbs.position);

		let (isbn, isbn_13) = book
			.default_physical_edition
			.as_ref()
			.map(|ed| (ed.isbn_10.clone(), ed.isbn_13.clone()))
			.unwrap_or((None, None));

		let genres: Option<Vec<String>> = book
			.cached_tags
			.as_ref()
			.and_then(|v| v.get("Genre"))
			.and_then(|v| v.as_array())
			.map(|arr| {
				arr.iter()
					.filter_map(|t| t.get("tag")?.as_str().map(|s| s.to_string()))
					.collect()
			});

		let tags: Option<Vec<String>> = book.cached_tags.as_ref().map(|cached| {
			["Tag", "Mood"]
				.iter()
				.filter_map(|category| cached.get(*category)?.as_array())
				.flatten()
				.filter_map(|t| t.get("tag")?.as_str().map(|s| s.to_string()))
				.collect()
		});

		let (year, month, day) =
			match book.release_date.and_then(|d| dateparser::parse(&d).ok()) {
				Some(date) => (
					Some(date.year()),
					Some(date.month() as i32),
					Some(date.day() as i32),
				),
				None => (book.release_year, None, None),
			};

		let series_name = book
			.featured_book_series
			.as_ref()
			.and_then(|fbs| fbs.series.as_ref().and_then(|s| s.name.clone()));
		let series_external_id = book.featured_book_series_id.map(|id| id.to_string());

		Ok(ExternalMediaMetadata {
			provider: self.id().to_string(),
			external_id: book.id.to_string(),
			series_name,
			series_external_id,
			title: book.title,
			summary: book.description,
			number,
			year,
			month,
			day,
			page_count: book.pages,
			isbn,
			isbn_13,
			writers: Some(writers),
			cover_url,
			provider_url: book
				.slug
				.map(|s| format!("https://hardcover.app/books/{}", s)),
			genres,
			tags,
			..Default::default()
		})
	}
}

#[derive(Debug, Deserialize)]
pub struct GraphQLResponse<T> {
	pub data: Option<T>,
	pub errors: Option<Vec<GraphQLError>>,
}

#[derive(Debug, Deserialize)]
pub struct GraphQLError {
	pub message: String,
}

#[derive(Debug, Deserialize)]
pub struct SearchData {
	pub search: SearchResponse,
}

#[derive(Debug, Deserialize)]
pub struct SearchResponse {
	pub results: serde_json::Value,
}

impl SearchResponse {
	pub fn parse_book_hits(&self) -> Result<Vec<BookHit>, MetadataProviderError> {
		let container: HitsContainer<BookDocument> =
			serde_json::from_value(self.results.clone())?;
		Ok(container.hits.unwrap_or_default())
	}

	pub fn parse_series_hits(&self) -> Result<Vec<SeriesHit>, MetadataProviderError> {
		let container: HitsContainer<SeriesDocument> =
			serde_json::from_value(self.results.clone())?;
		Ok(container.hits.unwrap_or_default())
	}
}

#[derive(Debug, Deserialize)]
pub struct HitsContainer<T> {
	pub hits: Option<Vec<Hit<T>>>,
}

#[derive(Debug, Deserialize)]
pub struct Hit<T> {
	pub document: T,
}

pub type BookHit = Hit<BookDocument>;
pub type SeriesHit = Hit<SeriesDocument>;

/// Document returned from book search
/// Fields from: https://docs.hardcover.app/api/guides/searching/#books
#[derive(Debug, Deserialize)]
pub struct BookDocument {
	#[serde(deserialize_with = "string_or_number")]
	pub id: String,
}

/// Document returned from series search
/// Fields from: https://docs.hardcover.app/api/guides/searching/#series
#[derive(Debug, Deserialize)]
pub struct SeriesDocument {
	#[serde(deserialize_with = "string_or_number")]
	pub id: String,
}

// TODO(author-entity): collect id of author eventually
#[derive(Debug, Deserialize)]
pub struct AuthorRef {
	pub name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SeriesQueryData {
	pub series: Vec<SeriesDetail>,
}

/// See https://docs.hardcover.app/api/graphql/schemas/series/
#[derive(Debug, Deserialize)]
pub struct SeriesDetail {
	pub id: i64,
	pub name: Option<String>,
	pub description: Option<String>,
	pub books_count: Option<i32>,
	pub author: Option<AuthorRef>,
}

#[derive(Debug, Deserialize)]
pub struct BookQueryData {
	pub books: Vec<BookDetail>,
}

/// See https://docs.hardcover.app/api/graphql/schemas/books
#[derive(Debug, Deserialize)]
pub struct BookDetail {
	pub id: i64,
	pub slug: Option<String>,
	pub title: Option<String>,
	pub description: Option<String>,
	pub release_year: Option<i32>,
	pub release_date: Option<String>,
	pub pages: Option<i32>,
	pub cached_image: Option<serde_json::Value>,
	pub cached_contributors: Option<serde_json::Value>,
	pub cached_tags: Option<serde_json::Value>,
	pub featured_book_series: Option<FeaturedBookSeries>,
	pub featured_book_series_id: Option<i64>,
	pub default_physical_edition: Option<EditionRef>,
}

#[derive(Debug, Deserialize)]
pub struct FeaturedBookSeries {
	pub position: Option<f32>,
	pub series: Option<SeriesNameRef>,
}

#[derive(Debug, Deserialize)]
pub struct SeriesNameRef {
	pub name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct EditionRef {
	pub isbn_10: Option<String>,
	pub isbn_13: Option<String>,
}

#[cfg(test)]
mod tests {
	use super::*;

	fn get_test_client() -> HardcoverClient {
		dotenvy::dotenv().ok();
		let api_token =
			std::env::var("HARDCOVER_API_TOKEN").expect("HARDCOVER_API_TOKEN not set");
		HardcoverClient::new(api_token, None)
	}

	#[ignore = "Requires HARDCOVER_API_TOKEN env var"]
	#[tokio::test]
	async fn test_search_series() {
		let client = get_test_client();
		let query = SearchQuery {
			title: "Wayfarers".to_string(),
			limit: Some(5),
			..Default::default()
		};

		let results = client.search_series(&query).await;
		println!("search_series results: {:#?}", results);
		assert!(results.is_ok());

		let candidates = results.unwrap();
		assert!(!candidates.is_empty());
		println!("Found {} series candidates", candidates.len());
		for candidate in &candidates {
			println!("{:?}", candidate);
		}
	}

	#[ignore = "Requires HARDCOVER_API_TOKEN env var"]
	#[tokio::test]
	async fn test_search_media() {
		let client = get_test_client();
		let query = SearchQuery {
			title: "The Long Way to a Small, Angry Planet".to_string(),
			limit: Some(5),
			..Default::default()
		};

		let results = client.search_media(&query).await;
		println!("search_media results: {:#?}", results);
		assert!(results.is_ok());

		let candidates = results.unwrap();
		assert!(!candidates.is_empty());
		println!("Found {} book candidates", candidates.len());
		for candidate in &candidates {
			println!("{:?}", candidate);
		}
	}

	#[ignore = "Requires HARDCOVER_API_TOKEN env var"]
	#[tokio::test]
	async fn test_fetch_series_metadata() {
		let client = get_test_client();

		let query = SearchQuery {
			title: "Wayfarers".to_string(),
			limit: Some(1),
			..Default::default()
		};

		let search_results = client.search_series(&query).await.unwrap();
		assert!(!search_results.is_empty());

		let series_id = &search_results[0].external_id;
		println!("Fetching series metadata for ID: {}", series_id);

		let metadata = client.fetch_series_metadata(series_id).await;
		println!("fetch_series_metadata result: {:#?}", metadata);
		assert!(metadata.is_ok());

		let meta = metadata.unwrap();
		println!("Series: {} (volumes: {:?})", meta.title, meta.volume_count);
	}

	#[ignore = "Requires HARDCOVER_API_TOKEN env var"]
	#[tokio::test]
	async fn test_fetch_media_metadata() {
		let client = get_test_client();

		let query = SearchQuery {
			title: "The Long Way to a Small, Angry Planet".to_string(),
			limit: Some(1),
			..Default::default()
		};

		let search_results = client.search_media(&query).await.unwrap();
		assert!(!search_results.is_empty());

		let book_id = &search_results[0].external_id;
		println!("Fetching book metadata for ID: {}", book_id);

		let metadata = client.fetch_media_metadata(book_id).await;
		println!("fetch_media_metadata result: {:#?}", metadata);
		assert!(metadata.is_ok());

		let meta = metadata.unwrap();
		println!(
			"Book: {:?} by {:?} ({:?} pages)",
			meta.title, meta.writers, meta.page_count
		);
	}
}
