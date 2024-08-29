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
	library_options
});
