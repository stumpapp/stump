use models::entity::{media, series, user};
use models::shared::enums::FileStatus;
use rand::distr::SampleString;
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
			pages: ActiveValue::Set(940),
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
pub struct Series {
	name: Option<String>,
	path: Option<String>,
}

impl Series {
	pub async fn insert(&self, db: &DbConn) -> series::Model {
		let name = self.name.clone().unwrap_or_else(|| {
			rand::distr::Alphabetic.sample_string(&mut rand::rng(), 16)
		});

		let path = self.path.clone().unwrap_or_else(|| format!("/tmp/{name}"));

		let model = series::ActiveModel {
			name: sea_orm::Set(name),
			path: sea_orm::Set(path),
			..Default::default()
		};

		model.insert(db).await.expect("could not insert series")
	}
}
