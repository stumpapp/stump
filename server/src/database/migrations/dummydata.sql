INSERT INTO library (name, path) VALUES (
	"Marvel Comics",
	"/Users/aaronleopold/Documents/stump_tests/Marvel Comics"
);

INSERT INTO series (library_id, title, book_count, updated_at, path) VALUES
	(
		1,
		"Amazing Spider-Man",
		1,
		"01/22/2022",
		"/Users/aaronleopold/Documents/stump_tests/Marvel Comics/Amazing Spider-Man"
	),
	(
		1,
		"Something Else",
		0,
		"01/22/2022",
		"/Users/aaronleopold/Documents/stump_tests/Marvel Comics/Something Else"
	),
	(
		1,
		"Venom",
		0,
		"01/22/2022",
		"/Users/aaronleopold/Documents/stump_tests/Marvel Comics/Venom"
	);
	
INSERT INTO media (series_id, name, description,size,extension,pages,updated_at,downloaded,checksum,path) VALUES

	(
		1,
		"Spider-Man - Blue (2011)",
		NULL,
		210500000,
		"cbz",
		153,
		"01/15/2022",
		0,
    "8ba291b75e143f2cb1c3c0c05040572c1ea07fc6750bef185374eb55348dea13",
		"/Users/aaronleopold/Documents/stump_tests/Marvel Comics/Amazing Spider-Man/Spider-Man - Blue (2011).cbz"
	);