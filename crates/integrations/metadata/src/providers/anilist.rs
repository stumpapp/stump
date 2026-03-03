use reqwest_middleware::ClientWithMiddleware;

use crate::RateLimiter;

pub struct AnilistClient {
	client: ClientWithMiddleware,
	api_token: Option<String>,
	rate_limiter: RateLimiter,
}

impl AnilistClient {
	const API_URL: &'static str = "https://graphql.anilist.co";
}

/*
Basic Example:

query ($search: String!) {
  Page {
	media(search: $search, type: ANIME) {
	  id
	  title {
		romaji
		english
		native
	  }
	}
  }
}

Advanced Example:

query (
  $page: Int = 1
  $id: Int
  $type: MediaType
  $isAdult: Boolean = false
  $search: String
  $format: [MediaFormat]
  $status: MediaStatus
  $countryOfOrigin: CountryCode
  $source: MediaSource
  $season: MediaSeason
  $seasonYear: Int
  $year: String
  $onList: Boolean
  $yearLesser: FuzzyDateInt
  $yearGreater: FuzzyDateInt
  $episodeLesser: Int
  $episodeGreater: Int
  $durationLesser: Int
  $durationGreater: Int
  $chapterLesser: Int
  $chapterGreater: Int
  $volumeLesser: Int
  $volumeGreater: Int
  $licensedBy: [Int]
  $isLicensed: Boolean
  $genres: [String]
  $excludedGenres: [String]
  $tags: [String]
  $excludedTags: [String]
  $minimumTagRank: Int
  $sort: [MediaSort] = [POPULARITY_DESC, SCORE_DESC]
) {
  Page(page: $page, perPage: 20) {
	pageInfo {
	  hasNextPage
	}
	media(
	  id: $id
	  type: $type
	  season: $season
	  format_in: $format
	  status: $status
	  countryOfOrigin: $countryOfOrigin
	  source: $source
	  search: $search
	  onList: $onList
	  seasonYear: $seasonYear
	  startDate_like: $year
	  startDate_lesser: $yearLesser
	  startDate_greater: $yearGreater
	  episodes_lesser: $episodeLesser
	  episodes_greater: $episodeGreater
	  duration_lesser: $durationLesser
	  duration_greater: $durationGreater
	  chapters_lesser: $chapterLesser
	  chapters_greater: $chapterGreater
	  volumes_lesser: $volumeLesser
	  volumes_greater: $volumeGreater
	  licensedById_in: $licensedBy
	  isLicensed: $isLicensed
	  genre_in: $genres
	  genre_not_in: $excludedGenres
	  tag_in: $tags
	  tag_not_in: $excludedTags
	  minimumTagRank: $minimumTagRank
	  sort: $sort
	  isAdult: $isAdult
	) {
	  id
	  title {
		romaji
	  }
	}
  }
}

*/
