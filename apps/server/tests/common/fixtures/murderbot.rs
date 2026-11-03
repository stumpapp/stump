const BOOKS: [(&str, Option<f64>); 11] = [
	("Compulsory", Some(0.5)),
	("All Systems Red", Some(1.0)),
	("Artificial Condition", Some(2.0)),
	("Rogue Protocol", Some(3.0)),
	("Exit Strategy", Some(4.0)),
	("Home: Habitat, Range, Niche, Territory", Some(4.5)),
	("Fugitive Telemetry", Some(5.0)),
	("Network Effect", Some(6.0)),
	(
		"Rapport: Friendship, Solidarity, Communion, Empathy",
		Some(6.5),
	),
	("System Collapse", Some(7.0)),
	("Platform Decay", Some(8.0)),
];

use models::entity::{media, series};
use tests::fake_data;

use crate::common::TestApp;

pub async fn create_murderbot(app: &TestApp) -> (series::Model, Vec<media::Model>) {
	let conn = app.conn();

	let library = fake_data::Library::default().insert(conn).await;
	let series = fake_data::Series {
		name: Some("The Murderbot Diaries".to_string()),
		library_id: Some(library.id),
		..Default::default()
	}
	.insert(conn)
	.await;

	let mut books = Vec::new();
	for (name, number) in BOOKS {
		let book = fake_data::Media {
			series_id: series.id.clone(),
			name: Some(name.to_string()),
			metadata: number.map(|num| fake_data::MediaMetadata {
				number: Some(num),
				..Default::default()
			}),
			..Default::default()
		}
		.insert(conn)
		.await;
		books.push(book)
	}

	(series, books)
}

pub fn canonical_order() -> Vec<String> {
	BOOKS.iter().map(|(name, _)| name.to_string()).collect()
}
