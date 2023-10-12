pub struct GoogleBooksClient {
	pub api_key: String,
	pub client: reqwest::Client,
}

impl GoogleBooksClient {
	pub fn new(api_key: String) -> Self {
		let client = reqwest::Client::new();
		Self { api_key, client }
	}

	pub async fn get_book_by_isbn(
		&self,
		isbn: &str,
	) -> Result<(), Box<dyn std::error::Error>> {
		let url = format!(
			"https://www.googleapis.com/books/v1/volumes?q=isbn:{}&key={}",
			isbn, self.api_key
		);
		let response = self.client.get(&url).send().await?;
		let text = response.text().await?;
		println!("Response text: {text}");
		// let response = response.json::<GoogleBooksResponse>().await?;
		// let book = response.into();
		// Ok(book)
		unimplemented!()
	}
}
