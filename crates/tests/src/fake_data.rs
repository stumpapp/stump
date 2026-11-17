use chrono::Utc;
use models::entity::user::{AuthUser, LoginUser};
use models::entity::{
	book_club, book_club_book, book_club_discussion, book_club_member, library,
	library_config, media, media_metadata, reading_session, series, user,
};
use models::shared::book_club::BookClubMemberRoleSpec;
use models::shared::{
	book_club::BookClubMemberRole,
	enums::{FileStatus, ReadingStatus},
};
use rand::distr::SampleString;
use rust_decimal::prelude::FromPrimitive;
use sea_orm::{ActiveModelTrait, ActiveValue, DbConn, prelude::*};
use uuid::Uuid;

// note that None here means "use some default", not necessarily "set the value to None".
// that may make it impossible to set some values to None. I'm not sure how to avoid that while
// keeping good ergonomics.
#[derive(Default)]
pub struct Media {
	pub series_id: String,
	pub id: Option<String>,
	pub name: Option<String>,
	pub extension: Option<String>,
	pub size: Option<i64>,
	pub created_at: Option<DateTimeWithTimeZone>,
	pub modified_at: Option<DateTimeWithTimeZone>,
	pub deleted_at: Option<DateTimeWithTimeZone>,
	pub pages: Option<i32>,
	/// defaults to `<name>.<extension>`
	pub path: Option<String>,
	pub is_oneshot: bool,

	pub metadata: Option<MediaMetadata>,
}

#[derive(Default, Clone)]
pub struct MediaMetadata {
	pub number: Option<f64>,
	pub title: Option<String>,
	pub media_id: Option<String>,
}

impl MediaMetadata {
	pub async fn insert(&self, db: &DbConn) -> media_metadata::Model {
		let media_id = self
			.media_id
			.clone()
			.unwrap_or_else(|| Uuid::new_v4().to_string());

		let model = media_metadata::ActiveModel {
			media_id: sea_orm::Set(Some(media_id)),
			title: sea_orm::Set(self.title.clone()),
			number: self.number.map_or(ActiveValue::NotSet, |num| {
				sea_orm::Set(Some(Decimal::try_from(num).expect("invalid number")))
			}),
			..Default::default()
		}
		.insert(db)
		.await
		.expect("could not insert media metadata");

		model
	}
}

impl Media {
	pub async fn insert(&self, db: &DbConn) -> media::Model {
		let library_id = series::Entity::find_by_id(&self.series_id)
			.one(db)
			.await
			.expect("could not find series")
			.expect("series must exist")
			.library_id
			.expect("series must belong to a library");
		let id = self
			.id
			.clone()
			.unwrap_or_else(|| Uuid::new_v4().to_string());

		let name = self
			.name
			.clone()
			.unwrap_or_else(|| format!("Test Book {id}"));
		let extension = self.extension.clone().unwrap_or("epub".to_string());
		let metadata = self.metadata.clone();

		let model = media::ActiveModel {
			library_id: ActiveValue::Set(library_id),
			series_id: ActiveValue::Set(Some(self.series_id.clone())),
			id: ActiveValue::Set(id.clone()),
			name: ActiveValue::Set(name.clone()),
			extension: sea_orm::Set(extension.clone()),
			size: self.size.map_or(ActiveValue::Set(1234), ActiveValue::Set),
			pages: ActiveValue::Set(self.pages.unwrap_or(940)),
			modified_at: self
				.modified_at
				.map_or(ActiveValue::default(), |t| ActiveValue::Set(Some(t))),
			deleted_at: self
				.deleted_at
				.map_or(ActiveValue::default(), |t| ActiveValue::Set(Some(t))),
			path: sea_orm::Set(
				self.path
					.clone()
					.unwrap_or_else(|| format!("{name}.{extension}")),
			),
			is_oneshot: sea_orm::Set(self.is_oneshot),
			status: sea_orm::Set(FileStatus::Ready),
			..Default::default()
		};

		let insert_result = model.insert(db).await.expect("could not insert media");

		// "created_at" is overridden by the ActiveModelBehavior, so we need to update it explicitly.
		let book = match self.created_at {
			Some(t) => {
				let mut model: media::ActiveModel = insert_result.into();
				model.created_at = ActiveValue::Set(t);
				model.update(db).await.expect("could not update media")
			},
			None => insert_result,
		};

		if let Some(metadata) = metadata {
			let _meta_model = MediaMetadata {
				media_id: Some(book.id.clone()),
				..metadata
			}
			.insert(db)
			.await;
		}

		book
	}
}

#[derive(Default)]
pub struct User {
	username: String,
	hashed_password: Option<String>,
}

impl User {
	pub fn new<T: ToString>(username: T) -> Self {
		User {
			username: username.to_string(),
			..Default::default()
		}
	}

	pub async fn insert(&self, db: &DbConn) -> user::Model {
		let model = user::ActiveModel {
			username: sea_orm::Set(self.username.clone()),
			hashed_password: sea_orm::Set(
				self.hashed_password.clone().unwrap_or("".to_string()),
			),
			is_server_owner: sea_orm::Set(true),
			is_locked: sea_orm::Set(false),
			..Default::default()
		};

		model.insert(db).await.expect("could not insert user")
	}

	pub async fn auth_user(&self, db: &DbConn) -> AuthUser {
		let user = self.insert(db).await;
		AuthUser::from(
			LoginUser::find_by_id(user.id)
				.into_model::<LoginUser>()
				.one(db)
				.await
				.expect("should exec query")
				.expect("should find user"),
		)
	}
}

#[derive(Default)]
pub struct Library {
	pub id: Option<String>,
	pub name: Option<String>,
	pub path: Option<String>,
}

impl Library {
	pub async fn insert(&self, db: &DbConn) -> library::Model {
		let id = self
			.id
			.clone()
			.unwrap_or_else(|| Uuid::new_v4().to_string());

		let name = self.name.clone().unwrap_or_else(|| {
			rand::distr::Alphabetic.sample_string(&mut rand::rng(), 16)
		});

		let path = self.path.clone().unwrap_or_else(|| format!("/tmp/{name}"));

		let config = library_config::ActiveModel {
			library_id: sea_orm::Set(Some(id.clone())),
			..Default::default()
		}
		.insert(db)
		.await
		.expect("could not insert library config");

		let model = library::ActiveModel {
			id: sea_orm::Set(id.clone()),
			name: sea_orm::Set(name),
			path: sea_orm::Set(path),
			config_id: sea_orm::Set(config.id),
			..Default::default()
		};

		model.insert(db).await.expect("could not insert library")
	}
}

#[derive(Default)]
pub struct Series {
	pub id: Option<String>,
	pub name: Option<String>,
	pub path: Option<String>,
	pub library_id: Option<String>,
	pub is_oneshot: bool,
}

impl Series {
	pub async fn insert(&self, db: &DbConn) -> series::Model {
		let library_id = match &self.library_id {
			Some(id) => id.clone(),
			None => Library::default().insert(db).await.id,
		};
		let id = self
			.id
			.clone()
			.unwrap_or_else(|| Uuid::new_v4().to_string());

		let name = self.name.clone().unwrap_or_else(|| {
			rand::distr::Alphabetic.sample_string(&mut rand::rng(), 16)
		});

		let path = self.path.clone().unwrap_or_else(|| format!("/tmp/{name}"));

		let model = series::ActiveModel {
			id: sea_orm::Set(id.clone()),
			name: sea_orm::Set(name),
			path: sea_orm::Set(Some(path)),
			is_oneshot: sea_orm::Set(self.is_oneshot),
			library_id: sea_orm::Set(Some(library_id)),
			..Default::default()
		};

		model.insert(db).await.expect("could not insert series")
	}
}

#[derive(Default)]
pub struct ReadingSession {
	pub media_id: String,
	pub user_id: String,
	pub end_percentage: f32,
	pub status: ReadingStatus,
	/// override the `created_at` timestamp set by `ActiveModelBehavior`, e.g.,
	/// for tests that need deterministic ordering between sessions
	pub created_at: Option<DateTimeWithTimeZone>,
}

impl ReadingSession {
	/// shorthand for a completed readthrough (end_percentage = 1.0, did_complete = true)
	pub fn completed(media_id: impl ToString, user_id: impl ToString) -> Self {
		Self {
			media_id: media_id.to_string(),
			user_id: user_id.to_string(),
			end_percentage: 1.0,
			status: ReadingStatus::Finished,
			..Default::default()
		}
	}

	pub async fn insert(&self, db: &DbConn) -> reading_session::Model {
		let model = reading_session::ActiveModel {
			session_date: sea_orm::Set(Utc::now().date_naive()),
			media_id: sea_orm::Set(self.media_id.clone()),
			user_id: sea_orm::Set(self.user_id.clone()),
			end_percentage: sea_orm::Set(rust_decimal::Decimal::from_f32(
				self.end_percentage,
			)),
			status: sea_orm::Set(self.status),
			readthrough_number: sea_orm::Set(1),
			..Default::default()
		};

		let insert_result = model
			.insert(db)
			.await
			.expect("could not insert reading session v2");

		// `created_at` is overridden by `ActiveModelBehavior` so updating after
		match self.created_at {
			Some(t) => {
				let mut model: reading_session::ActiveModel = insert_result.into();
				model.created_at = ActiveValue::Set(t);
				model
					.update(db)
					.await
					.expect("could not update reading session")
			},
			None => insert_result,
		}
	}
}

#[derive(Default)]
pub struct BookClub {
	pub id: Option<String>,
	pub name: Option<String>,
	pub slug: Option<String>,
	pub description: Option<String>,
	pub is_private: bool,
	pub member_role_spec: Option<BookClubMemberRoleSpec>,
	pub emoji: Option<String>,
}

impl BookClub {
	pub async fn insert(&self, db: &DbConn) -> book_club::Model {
		let id = self
			.id
			.clone()
			.unwrap_or_else(|| Uuid::new_v4().to_string());
		let name = self.name.clone().unwrap_or_else(|| "Fake Club".to_string());
		let slug = self
			.slug
			.clone()
			.unwrap_or_else(|| format!("{}-{id}", name.to_lowercase().replace(' ', "-")));

		book_club::ActiveModel {
			id: ActiveValue::Set(id),
			name: ActiveValue::Set(name),
			slug: ActiveValue::Set(slug),
			description: ActiveValue::Set(self.description.clone()),
			is_private: ActiveValue::Set(self.is_private),
			member_role_spec: ActiveValue::Set(self.member_role_spec.clone()),
			created_at: ActiveValue::Set(Utc::now().into()),
			emoji: ActiveValue::Set(self.emoji.clone()),
		}
		.insert(db)
		.await
		.expect("could not insert book club")
	}
}

#[derive(Default)]
pub struct BookClubMember {
	pub id: Option<String>,
	pub display_name: Option<String>,
	pub bio: Option<String>,
	pub hide_progress: bool,
	pub role: BookClubMemberRole,
	pub joined_at: Option<DateTimeWithTimeZone>,
	pub user_id: String,
	pub book_club_id: String,
}

impl BookClubMember {
	pub async fn insert(&self, db: &DbConn) -> book_club_member::Model {
		let id = self
			.id
			.clone()
			.unwrap_or_else(|| Uuid::new_v4().to_string());

		book_club_member::ActiveModel {
			id: ActiveValue::Set(id),
			display_name: ActiveValue::Set(self.display_name.clone()),
			bio: ActiveValue::Set(self.bio.clone()),
			hide_progress: ActiveValue::Set(self.hide_progress),
			role: ActiveValue::Set(self.role),
			joined_at: ActiveValue::Set(
				self.joined_at.unwrap_or_else(|| Utc::now().into()),
			),
			user_id: ActiveValue::Set(self.user_id.clone()),
			book_club_id: ActiveValue::Set(self.book_club_id.clone()),
		}
		.insert(db)
		.await
		.expect("could not insert book club member")
	}
}

#[derive(Default)]
pub struct BookClubBook {
	pub id: Option<String>,
	pub position: i32,
	pub completed_at: Option<DateTimeWithTimeZone>,
	pub title: Option<String>,
	pub author: Option<String>,
	pub url: Option<String>,
	pub image_url: Option<String>,
	pub book_entity_id: Option<String>,
	pub book_club_id: String,
}

impl BookClubBook {
	pub async fn insert(&self, db: &DbConn) -> book_club_book::Model {
		let id = self
			.id
			.clone()
			.unwrap_or_else(|| Uuid::new_v4().to_string());

		book_club_book::ActiveModel {
			id: ActiveValue::Set(id),
			position: ActiveValue::Set(self.position),
			completed_at: ActiveValue::Set(self.completed_at),
			title: ActiveValue::Set(self.title.clone()),
			author: ActiveValue::Set(self.author.clone()),
			url: ActiveValue::Set(self.url.clone()),
			image_url: ActiveValue::Set(self.image_url.clone()),
			book_entity_id: ActiveValue::Set(self.book_entity_id.clone()),
			book_club_id: ActiveValue::Set(self.book_club_id.clone()),
			..Default::default()
		}
		.insert(db)
		.await
		.expect("could not insert book club book")
	}
}

#[derive(Default)]
pub struct BookClubDiscussion {
	pub id: Option<String>,
	pub is_locked: bool,
	pub is_archived: bool,
	pub book_club_book_id: Option<String>,
	pub title: Option<String>,
	pub emoji: Option<String>,
	pub is_pinned: bool,
	pub book_club_id: String,
}

impl BookClubDiscussion {
	pub async fn insert(&self, db: &DbConn) -> book_club_discussion::Model {
		let id = self
			.id
			.clone()
			.unwrap_or_else(|| Uuid::new_v4().to_string());

		book_club_discussion::ActiveModel {
			id: ActiveValue::Set(id),
			is_locked: ActiveValue::Set(self.is_locked),
			is_archived: ActiveValue::Set(self.is_archived),
			book_club_book_id: ActiveValue::Set(self.book_club_book_id.clone()),
			title: ActiveValue::Set(self.title.clone()),
			emoji: ActiveValue::Set(self.emoji.clone()),
			is_pinned: ActiveValue::Set(self.is_pinned),
			created_at: ActiveValue::Set(Utc::now().into()),
			book_club_id: ActiveValue::Set(self.book_club_id.clone()),
		}
		.insert(db)
		.await
		.expect("could not insert book club discussion")
	}
}
