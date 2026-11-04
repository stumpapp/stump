use std::collections::HashMap;

pub struct EntityCache<E: NameKeyedEntity> {
	by_key: HashMap<String, E::Id>,
}

pub trait NameKeyedEntity {
	type Id: Clone;

	// get(key:&str)
	// async find(keys: set<string>)
	// async insert(values: hashmap<string, ??>) <-- insert new only ig
}

// just roughing this out, i think tag_cache could impl this and then similarly
// id do an author_cache
