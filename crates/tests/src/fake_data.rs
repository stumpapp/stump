use chrono::Utc;
use models::entity::{library, library_config, media, reading_session, series, user};
use models::shared::enums::{FileStatus, ReadingStatus};
use rand::distr::SampleString;
use rust_decimal::prelude::FromPrimitive;
use sea_orm::{prelude::DateTimeWithTimeZone, ActiveModelTrait, ActiveValue, DbConn};
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
	pub created_at: Option<DateTimeWithTimeZone>,
	pub modified_at: Option<DateTimeWithTimeZone>,
	pub deleted_at: Option<DateTimeWithTimeZone>,
	pub pages: Option<i32>,
}

impl Media {
	pub async fn insert(&self, db: &DbConn) -> media::Model {
		let id = self
			.id
			.clone()
			.unwrap_or_else(|| Uuid::new_v4().to_string());

		let name = self
			.name
			.clone()
			.unwrap_or_else(|| format!("Test Book {id}"));
		let extension = self.extension.clone().unwrap_or("epub".to_string());

		let model = media::ActiveModel {
			series_id: ActiveValue::Set(Some(self.series_id.clone())),
			id: ActiveValue::Set(id.clone()),
			name: ActiveValue::Set(name.clone()),
			size: ActiveValue::Set(1234),
			extension: sea_orm::Set(extension.clone()),
			pages: ActiveValue::Set(self.pages.unwrap_or(940)),
			modified_at: self
				.modified_at
				.map_or(ActiveValue::default(), |t| ActiveValue::Set(Some(t))),
			deleted_at: self
				.deleted_at
				.map_or(ActiveValue::default(), |t| ActiveValue::Set(Some(t))),
			path: sea_orm::Set(format!("{name}.{extension}").to_string()),
			status: sea_orm::Set(FileStatus::Ready),
			..Default::default()
		};

		let insert_result = model.insert(db).await.expect("could not insert media");

		// "created_at" is overridden by the ActiveModelBehavior, so we need to update it explicitly.
		match self.created_at {
			Some(t) => {
				let mut model: media::ActiveModel = insert_result.into();
				model.created_at = ActiveValue::Set(t);
				model.update(db).await.expect("could not update media")
			},
			None => insert_result,
		}
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
}

impl Series {
	pub async fn insert(&self, db: &DbConn) -> series::Model {
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
			path: sea_orm::Set(path),
			library_id: match &self.library_id {
				Some(lib_id) => sea_orm::Set(Some(lib_id.clone())),
				None => sea_orm::NotSet,
			},
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
