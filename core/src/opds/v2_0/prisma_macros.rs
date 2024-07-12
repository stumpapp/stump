use crate::prisma::media;

// TODO(311): we might want reading progress too, depends on what metadata and/or what kind
// of entry it will be converted to in the feed...

media::include!(books_as_publications {
	metadata
	series: select {
		id
		name
		metadata: select {
			title
		}
	}
});
