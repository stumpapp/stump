use tracing::error;

use super::ProcessedMediaMetadata;

pub fn is_accepted_cover_name(name: &str) -> bool {
	let cover_file_names = ["cover", "thumbnail", "folder"];
	cover_file_names
		.iter()
		.any(|&cover_name| name.eq_ignore_ascii_case(cover_name))
}

pub(crate) fn metadata_from_buf(contents: &str) -> Option<ProcessedMediaMetadata> {
	let adjusted = contents.trim();
	// let adjusted = adjusted.trim_start_matches("<?xml version=\"1.0\" encoding=\"utf-8\"?>");

	if adjusted.is_empty() {
		return None;
	}

	match serde_xml_rs::from_str(adjusted) {
		Ok(meta) => Some(meta),
		Err(err) => {
			println!("Failed to parse metadata from buf: {err}");
			error!(error = ?err, content = adjusted, "Failed to parse metadata from buf");
			None
		},
	}
}

pub(crate) fn sort_file_names<S>(file_names: &mut [S])
where
	S: AsRef<str>,
{
	alphanumeric_sort::sort_str_slice(file_names);
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_is_accepted_cover_name() {
		let cover_file_names = ["cover", "thumbnail", "folder"];
		for cover_name in cover_file_names {
			assert!(is_accepted_cover_name(cover_name));
		}
	}

	#[test]
	fn test_is_not_accepted_cover_name() {
		let cover_file_names = vec!["cover1", "thumbnail1", "folder1"];
		for cover_name in cover_file_names {
			assert!(!is_accepted_cover_name(cover_name));
		}
	}

	#[test]
	fn test_sort_numeric_file_names() {
		let mut names = ["3.jpg", "1.jpg", "5.jpg", "2.jpg", "4.jpg"];
		sort_file_names(&mut names);
		let expected = ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg"];
		assert_eq!(names, expected);
	}

	#[test]
	fn test_sort_alphanumeric_file_names() {
		let mut names = ["shot-2", "shot-1", "shot-11", "shot-10", "shot-3"];
		sort_file_names(&mut names);
		let expected = ["shot-1", "shot-2", "shot-3", "shot-10", "shot-11"];
		assert_eq!(names, expected);
	}

	#[test]
	fn test_should_parse_incomplete_metadata() {
		let contents = "<?xml version=\"1.0\"?>\n<ComicInfo xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\">\n  <Series>Delete</Series>\n  <Number>1</Number>\n  <Volume>2016</Volume>\n  <Summary>In the near future, where science can implant or remove human memories and the government uses brain scan technology in criminal investigations, a mute girl witnesses a multiple murder and must turn to a handyman for protection from the police and an army of killers. From the Harley Quinn team of writers Jimmy Palmiotti and Justin Grey and artist John Timms, with covers by Amanda Conner.\n\n\nNote: The digital edition (3/2/2016) for this issue was released before the print edition.</Summary>\n  <Notes>Tagged with ComicTagger 1.3.0-alpha.0 using info from Comic Vine on 2021-12-01 20:34:52.  [Issue ID 517895]</Notes>\n  <Year>2016</Year>\n  <Month>03</Month>\n  <Day>31</Day>\n  <Writer>Jimmy Palmiotti, Justin Gray</Writer>\n  <Penciller>John Timms, John Timms</Penciller>\n  <Inker>John Timms, John Timms</Inker>\n  <Colorist>David Curiel, Paul Mounts</Colorist>\n  <Letterer>Bill Tortolini</Letterer>\n  <CoverArtist>Amanda Conner, Paul Mounts</CoverArtist>\n  <Editor>Alex Wald, Joanne Starer</Editor>\n  <Publisher>1First Comics</Publisher>\n  <Web>https://comicvine.gamespot.com/delete-1/4000-517895/</Web>\n  <PageCount>27</PageCount>\n  <ScanInformation>(digital) (Son of Ultron-Empire)</ScanInformation>\n  <Pages>\n    <Page Image=\"0\" ImageSize=\"907332\" Type=\"FrontCover\" />\n    <Page Image=\"1\" ImageSize=\"431378\" />\n    <Page Image=\"2\" ImageSize=\"776720\" />\n    <Page Image=\"3\" ImageSize=\"524902\" />\n    <Page Image=\"4\" ImageSize=\"753942\" />\n    <Page Image=\"5\" ImageSize=\"607990\" />\n    <Page Image=\"6\" ImageSize=\"438880\" />\n    <Page Image=\"7\" ImageSize=\"504806\" />\n    <Page Image=\"8\" ImageSize=\"532746\" />\n    <Page Image=\"9\" ImageSize=\"542816\" />\n    <Page Image=\"10\" ImageSize=\"571650\" />\n    <Page Image=\"11\" ImageSize=\"626656\" />\n    <Page Image=\"12\" ImageSize=\"605810\" />\n    <Page Image=\"13\" ImageSize=\"585234\" />\n    <Page Image=\"14\" ImageSize=\"553270\" />\n    <Page Image=\"15\" ImageSize=\"440568\" />\n    <Page Image=\"16\" ImageSize=\"483816\" />\n    <Page Image=\"17\" ImageSize=\"492922\" />\n    <Page Image=\"18\" ImageSize=\"470748\" />\n    <Page Image=\"19\" ImageSize=\"644256\" />\n    <Page Image=\"20\" ImageSize=\"584142\" />\n    <Page Image=\"21\" ImageSize=\"425322\" />\n    <Page Image=\"22\" ImageSize=\"565166\" />\n    <Page Image=\"23\" ImageSize=\"582706\" />\n    <Page Image=\"24\" ImageSize=\"507370\" />\n    <Page Image=\"25\" ImageSize=\"489280\" />\n    <Page Image=\"26\" ImageSize=\"519906\" />\n  </Pages>\n</ComicInfo>";
		let metadata = metadata_from_buf(contents).unwrap();

		assert_eq!(metadata.series, Some("Delete".to_string()));
		assert_eq!(metadata.number, Some(1f64));
		assert_eq!(metadata.volume, Some(2016));
	}

	#[test]
	fn test_malformed_media_xml() {
		// An empty string
		let contents = "";
		let metadata = metadata_from_buf(contents);
		assert!(metadata.is_none());

		// Something JSON-ish instead of xml
		let contents = "metadata: { contents: oops }";
		let metadata = metadata_from_buf(contents);
		assert!(metadata.is_none());
	}
}
