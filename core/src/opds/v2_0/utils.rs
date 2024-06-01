use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ArrayOrItem<T> {
	Array(Vec<T>),
	Item(T),
}
