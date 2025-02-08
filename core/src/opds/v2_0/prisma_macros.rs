use crate::prisma::{active_reading_session, media};

// TODO(OPDS-V2): we might want reading progress too, depends on what metadata and/or what kind
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

active_reading_session::select!(reading_session_opds_progression {
   page
   percentage_completed
   epubcfi
   updated_at
   device: select { id name }
	media: select {
	  id
	  extension
	 pages
	  metadata: select { page_dimensions }
   }
});
