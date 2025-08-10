use std::collections::HashMap;

use sea_orm::FromQueryResult;

#[derive(Debug, Clone, FromQueryResult)]
pub struct EntityLetter {
	letter: String,
	count: i64,
}

/// A struct which represents the available "alphabet" for a given model, i.e. the set of
/// managed entities (e.g., a library's series/books) which start with a given character.
/// The structure is a character to the number of entities starting with that character.
pub struct AvailableAlphabet(HashMap<String, i64>);

impl From<Vec<EntityLetter>> for AvailableAlphabet {
	fn from(letters: Vec<EntityLetter>) -> Self {
		let mut map = HashMap::from_iter(vec![
			("A".to_string(), 0),
			("B".to_string(), 0),
			("C".to_string(), 0),
			("D".to_string(), 0),
			("E".to_string(), 0),
			("F".to_string(), 0),
			("G".to_string(), 0),
			("H".to_string(), 0),
			("I".to_string(), 0),
			("J".to_string(), 0),
			("K".to_string(), 0),
			("L".to_string(), 0),
			("M".to_string(), 0),
			("N".to_string(), 0),
			("O".to_string(), 0),
			("P".to_string(), 0),
			("Q".to_string(), 0),
			("R".to_string(), 0),
			("S".to_string(), 0),
			("T".to_string(), 0),
			("U".to_string(), 0),
			("V".to_string(), 0),
			("W".to_string(), 0),
			("X".to_string(), 0),
			("Y".to_string(), 0),
			("Z".to_string(), 0),
		]);

		for letter in letters {
			if let Some(count) = map.get_mut(&letter.letter) {
				*count += letter.count;
			}
		}

		AvailableAlphabet(map)
	}
}

impl AvailableAlphabet {
	pub fn get(self) -> HashMap<String, i64> {
		self.0
	}
}
