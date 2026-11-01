use models::entity::{library, library_access};
use sea_orm::{ActiveModelTrait, ActiveValue};
use tests::fake_data;

use crate::common::TestApp;

pub async fn setup_library(
	app: &TestApp,
	fake_library: fake_data::Library,
	for_user_id: Option<String>,
) -> library::Model {
	let conn = app.conn();

	let user_id = match for_user_id {
		Some(id) => id,
		None => {
			let user = app.get_viewer().await;
			user["id"].as_str().unwrap().to_string()
		},
	};

	let library = fake_library.insert(conn).await;
	let _access_record = Box::new(library_access::ActiveModel {
		library_id: ActiveValue::Set(library.id.clone()),
		user_id: ActiveValue::Set(user_id),
		..Default::default()
	})
	.insert(conn)
	.await
	.expect("Failed to insert library access record");

	library
}
