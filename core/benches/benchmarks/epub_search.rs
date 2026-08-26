use std::path::PathBuf;

use criterion::{criterion_group, Criterion};
use stump_core::filesystem::media::{search_epub, EpubSearchOptions};
use tokio_util::sync::CancellationToken;

fn fixture_epub() -> String {
	PathBuf::from(env!("CARGO_MANIFEST_DIR"))
		.join("integration-tests/data/book.epub")
		.to_string_lossy()
		.to_string()
}

fn epub_search_bench(c: &mut Criterion) {
	let path = fixture_epub();
	let base = "https://example.com/api/v2/epub/bench";
	let cancel = CancellationToken::new();

	c.bench_function("epub_search_alice_limit_20", |b| {
		b.iter(|| {
			search_epub(
				&path,
				base,
				EpubSearchOptions::new("Alice").with_limit(20),
				&cancel,
			)
			.expect("search")
		})
	});
}

criterion_group!(benches, epub_search_bench);
