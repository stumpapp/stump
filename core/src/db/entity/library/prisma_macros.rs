use crate::prisma::library;

library::select!(library_tags_select {
	id
	tags: select {
		id
		name
	}
});

library::select!(library_path_with_options_select {
	path
	config
});

library::include!(library_series_ids_media_ids_include {
	series: include {
		media: select { id }
	}
});

library::include!(library_thumbnails_deletion_include {
	series: include {
		media: select { id }
	}
});

library::select!(library_name {
	id
	name
});
