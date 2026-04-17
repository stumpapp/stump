use std::collections::{BTreeSet, HashMap};

use async_graphql::{
	dataloader::DataLoader, ComplexObject, Context, Result, SimpleObject,
};
use models::shared::enums::AuthorRole;

use crate::{
	data::AuthContext,
	loader::author::{
		AuthorMediaLoader, AuthorMediaLoaderKey, MetadataSeriesMediaLoader,
		MetadataSeriesMediaLoaderKey,
	},
	object::media::Media,
};

// This is basically the same as it has been for ages but it should go with another note
// that this kind of parsing is super fragile. I wish metadata was WAY more standarized, because
// "Last, First" will just break hard
fn parse_writers(writers: &str) -> Vec<String> {
	writers
		.split(',')
		.map(|s| s.trim().to_string())
		.filter(|s| !s.is_empty())
		.collect()
}

fn determine_role(writers: &str, author_name: &str) -> AuthorRole {
	let authors = parse_writers(writers);
	if authors.first().map(|a| a == author_name).unwrap_or(false) {
		AuthorRole::Primary
	} else {
		AuthorRole::CoAuthor
	}
}

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct Author {
	pub name: String,
	/// The role of this author relative to the context they are queried in (e.g., a series).
	/// This field will be None when queried outside of a context in which an author has a role,
	/// like at a library-level query
	pub role: Option<AuthorRole>,
	// Note: This is kinda a hack, I basically use this as a means of scoping down
	// when set. The idea is when querying through a library node, it will be set
	// to that library's ID. When querying authors at query root, it won't.
	#[graphql(skip)]
	pub library_id: Option<String>,
}

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct AuthorSeries {
	pub title: String,
	// Note: This is kinda a hack, I basically use this as a means of scoping down
	// when set. The idea is when querying through a library node, it will be set
	// to that library's ID. When querying authors at query root, it won't.
	#[graphql(skip)]
	pub library_id: Option<String>,
}

/// A work that has multiple authors (co-authored). This wrapper allows querying
/// the authors/co-authors of the work in context.
#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct SharedWork {
	/// The media/book itself
	pub media: Media,
	/// The author from whose perspective we're viewing this shared work
	/// (used to compute co_authors by excluding this author)
	#[graphql(skip)]
	pub viewing_author: String,
	#[graphql(skip)]
	pub library_id: Option<String>,
}

#[ComplexObject]
impl SharedWork {
	/// All authors who contributed to this work, with their roles
	async fn authors(&self) -> Vec<Author> {
		let Some(ref metadata) = self.media.metadata else {
			return Vec::new();
		};
		let Some(ref writers) = metadata.model.writers else {
			return Vec::new();
		};

		parse_writers(writers)
			.into_iter()
			.map(|name| {
				let role = determine_role(writers, &name);
				Author {
					name,
					role: Some(role),
					library_id: self.library_id.clone(),
				}
			})
			.collect()
	}

	/// Authors who contributed to this work, excluding the viewing author
	async fn co_authors(&self) -> Vec<Author> {
		let Some(ref metadata) = self.media.metadata else {
			return Vec::new();
		};
		let Some(ref writers) = metadata.model.writers else {
			return Vec::new();
		};

		let viewing_lower = self.viewing_author.to_lowercase();
		parse_writers(writers)
			.into_iter()
			.filter(|name| name.to_lowercase() != viewing_lower)
			.map(|name| {
				let role = determine_role(writers, &name);
				Author {
					name,
					role: Some(role),
					library_id: self.library_id.clone(),
				}
			})
			.collect()
	}
}

#[ComplexObject]
impl AuthorSeries {
	async fn books(&self, ctx: &Context<'_>) -> Result<Vec<Media>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let loader = ctx.data::<DataLoader<MetadataSeriesMediaLoader>>()?;

		let key = MetadataSeriesMediaLoaderKey {
			series_title: self.title.clone(),
			library_id: self.library_id.clone(),
			user_id: user.id.clone(),
		};

		let media = loader.load_one(key).await?.unwrap_or_default();
		Ok(media)
	}

	/// Authors who contributed to this series
	async fn authors(&self, ctx: &Context<'_>) -> Result<Vec<Author>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let loader = ctx.data::<DataLoader<MetadataSeriesMediaLoader>>()?;

		let key = MetadataSeriesMediaLoaderKey {
			series_title: self.title.clone(),
			library_id: self.library_id.clone(),
			user_id: user.id.clone(),
		};

		let models = loader.load_one(key).await?.unwrap_or_default();

		let mut author_appearances: HashMap<String, (usize, AuthorRole)> = HashMap::new();

		for media in models {
			if let Some(ref metadata) = media.metadata {
				if let Some(ref writers) = metadata.model.writers {
					for name in parse_writers(writers.as_str()) {
						let role = determine_role(writers.as_str(), &name);
						author_appearances
							.entry(name)
							.and_modify(|(count, existing_role)| {
								*count += 1;
								// Promote to Primary if they're primary in any work
								if role == AuthorRole::Primary {
									*existing_role = AuthorRole::Primary;
								}
							})
							.or_insert((1, role));
					}
				}
			}
		}

		let mut authors: Vec<_> = author_appearances.into_iter().collect();
		authors.sort_by(|a, b| b.1 .0.cmp(&a.1 .0)); // descending by appearance count

		Ok(authors
			.into_iter()
			.map(|(name, (_, role))| Author {
				name,
				role: Some(role),
				library_id: self.library_id.clone(),
			})
			.collect())
	}
}

#[ComplexObject]
impl Author {
	async fn books(&self, ctx: &Context<'_>) -> Result<Vec<Media>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let loader = ctx.data::<DataLoader<AuthorMediaLoader>>()?;

		let key = AuthorMediaLoaderKey {
			author_name: self.name.clone(),
			library_id: self.library_id.clone(),
			user_id: user.id.clone(),
		};

		let media = loader.load_one(key).await?.unwrap_or_default();
		Ok(media)
	}

	async fn series(&self, ctx: &Context<'_>) -> Result<Vec<AuthorSeries>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let loader = ctx.data::<DataLoader<AuthorMediaLoader>>()?;

		let key = AuthorMediaLoaderKey {
			author_name: self.name.clone(),
			library_id: self.library_id.clone(),
			user_id: user.id.clone(),
		};

		let media = loader.load_one(key).await?.unwrap_or_default();

		let mut series_titles: BTreeSet<String> = BTreeSet::new();

		for m in &media {
			if let Some(ref metadata) = m.metadata {
				if let Some(ref series_name) = metadata.model.series {
					series_titles.insert(series_name.clone());
				}
			}
		}

		let series = series_titles
			.into_iter()
			.map(|title| AuthorSeries {
				title,
				library_id: self.library_id.clone(),
			})
			.collect();

		Ok(series)
	}

	/// Books where this author is the sole credited writer (no co-authors)
	async fn standalones(&self, ctx: &Context<'_>) -> Result<Vec<Media>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let loader = ctx.data::<DataLoader<AuthorMediaLoader>>()?;

		let key = AuthorMediaLoaderKey {
			author_name: self.name.clone(),
			library_id: self.library_id.clone(),
			user_id: user.id.clone(),
		};

		let media = loader.load_one(key).await?.unwrap_or_default();

		let standalones = media
			.into_iter()
			.filter(|m| {
				m.metadata
					.as_ref()
					.and_then(|md| md.model.writers.as_ref())
					.map(|w| {
						let authors = parse_writers(w);
						authors.len() == 1
							&& authors[0].to_lowercase() == self.name.to_lowercase()
					})
					.unwrap_or(false)
			})
			.collect();

		Ok(standalones)
	}

	/// Books where this author shares credit with other writers (co-authored works)
	async fn shared_works(&self, ctx: &Context<'_>) -> Result<Vec<SharedWork>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let loader = ctx.data::<DataLoader<AuthorMediaLoader>>()?;

		let key = AuthorMediaLoaderKey {
			author_name: self.name.clone(),
			library_id: self.library_id.clone(),
			user_id: user.id.clone(),
		};

		let media = loader.load_one(key).await?.unwrap_or_default();

		let shared = media
			.into_iter()
			.filter(|m| {
				m.metadata
					.as_ref()
					.and_then(|md| md.model.writers.as_ref())
					.map(|w| parse_writers(w).len() > 1)
					.unwrap_or(false)
			})
			.map(|media| SharedWork {
				media,
				viewing_author: self.name.clone(),
				library_id: self.library_id.clone(),
			})
			.collect();

		Ok(shared)
	}
}
