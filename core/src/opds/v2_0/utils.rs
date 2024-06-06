use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ArrayOrItem<T> {
	Array(Vec<T>),
	Item(T),
}
