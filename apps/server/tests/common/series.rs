use models::entity::{media, series};
use tests::fake_data;

use crate::common::TestApp;

pub async fn setup_single_series_with_n_books(
	app: &TestApp,
	fake_series: fake_data::Series,
	n: i32,
) -> (series::Model, Vec<media::Model>) {
	let conn = app.conn();

	let series = fake_series.insert(conn).await;

	let mut books = Vec::new();

	for i in 1..=n {
		let book = fake_data::Media {
			id: Some(format!("{}_{}", series.id.clone(), i)),
			name: Some(format!("{} #{}", series.name.clone(), i)),
			series_id: series.id.clone(),
			created_at: Some("2026-01-01T00:00:00Z".parse().unwrap()),
			pages: Some(100),
			..Default::default()
		}
		.insert(conn)
		.await;

		books.push(book);
	}

	(series, books)
}
