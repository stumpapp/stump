use crate::prisma::media;

// TODO: we probably will want reading progress too
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
