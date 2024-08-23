use crate::prisma::library;

library::select!(library_tags_select {
	id
	tags: select {
		id
		name
	}
});
