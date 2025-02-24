//! This module defines some utility functions for parsing a [`schemars::schema_for!`] output into a type,
// [`ConfigSchema`], for transmission to the frontend to allow config options to be rendered.

use schemars::schema::{InstanceType, RootSchema, Schema, SchemaObject, SingleOrVec};
use serde_json::Value;

/// Describes the JSON schema for a configuration of a [`MetadataSource`] implementation.
///
/// Internally, this type stores a [`Vec`] of [`SchemaField`]s.
#[derive(Debug)]
pub struct ConfigSchema {
	pub fields: Vec<SchemaField>,
}

/// Describes a field in a [`ConfigSchema`]. Encodes the `key` and `field_type` for the field.
#[derive(Debug)]
pub struct SchemaField {
	pub key: String,
	pub field_type: SchemaFieldType,
}

/// Describes the type of a [`ConfigSchema`] field.
///
/// Types can be:
///   - [`SchemaFieldType::Integer`] - A [`u32`], [`i32`], or similar type.
///   - [`SchemaFieldType::Float`] - An [`f64`] or similar type.
///   - [`SchemaFieldType::String`] - A [`String`] type.
#[derive(Debug)]
pub enum SchemaFieldType {
	Integer,
	Float,
	String,
}

impl ConfigSchema {
	pub fn validate_config(&self, json_str: &str) -> bool {
		let json: Value = match serde_json::from_str(json_str) {
			Ok(value) => value,
			Err(_) => return false,
		};

		if let Value::Object(mut map) = json {
			for field in &self.fields {
				match map.get(&field.key) {
					// Field found
					Some(value) => {
						if !field.validate_value(value) {
							return false;
						}
						map.remove(&field.key);
					},
					// Missing field
					None => return false,
				}
			}
			true
		} else {
			// Input is not a JSON object
			println!("False because {json:?} not JSON object");
			false
		}
	}
}

impl From<RootSchema> for ConfigSchema {
	fn from(value: RootSchema) -> Self {
		// Get the object validation part of the schema object
		let obj_validation = value
			.schema
			.object
			.expect("Schema should have an objects field");

		// Enumerate fields
		let mut fields = Vec::new();
		for (prop_key, prop_schema) in obj_validation.properties {
			if let Schema::Object(prop_schema_obj) = prop_schema {
				if let Some(field_type) = extract_field_type(&prop_schema_obj) {
					fields.push(SchemaField {
						key: prop_key,
						field_type,
					});
				}
			}
		}

		Self { fields }
	}
}

impl SchemaField {
	pub fn validate_value(&self, value: &Value) -> bool {
		match (&self.field_type, value) {
			(SchemaFieldType::Integer, Value::Number(num)) => {
				num.is_i64() || num.is_u64()
			},
			(SchemaFieldType::Float, Value::Number(num)) => num.is_f64(),
			(SchemaFieldType::String, Value::String(_)) => true,
			_ => false,
		}
	}
}

fn extract_field_type(obj: &SchemaObject) -> Option<SchemaFieldType> {
	if let Some(instance_types) = &obj.instance_type {
		let types = match instance_types {
			SingleOrVec::Single(single) => vec![*single.clone()],
			SingleOrVec::Vec(vec) => vec.clone(),
		};

		if let Some(first_type) = types.first() {
			return match *first_type {
				InstanceType::Integer => Some(SchemaFieldType::Integer),
				InstanceType::Number => Some(SchemaFieldType::Float),
				InstanceType::String => Some(SchemaFieldType::String),
				_ => None,
			};
		}
	}

	// TODO - Is this right?
	None
}

#[cfg(test)]
mod tests {
	use super::*;
	use schemars::{schema_for, JsonSchema};

	#[test]
	fn test_string_schema() {
		#[derive(JsonSchema)]
		#[allow(dead_code)]
		struct StringTest {
			value: String,
		}

		let root_schema = schema_for!(StringTest);
		let output = ConfigSchema::from(root_schema);

		// Make sure we're getting the expected ConfigSchema values
		assert_eq!(output.fields.len(), 1);
		let field = &output.fields[0];
		assert_eq!(field.key, "value");
		assert!(matches!(field.field_type, SchemaFieldType::String));

		// This should work
		let valid_json = r#"{ "value": "hello" }"#;
		assert!(output.validate_config(valid_json));

		// This should fail
		let invalid_json = r#"{ "value": 123 }"#;
		assert!(!output.validate_config(invalid_json));
	}

	#[test]
	fn test_int_schema() {
		#[derive(JsonSchema)]
		#[allow(dead_code)]
		struct IntTest {
			value: i32,
		}

		let root_schema = schema_for!(IntTest);
		let output = ConfigSchema::from(root_schema);

		// Make sure we're getting the expected ConfigSchema values
		assert_eq!(output.fields.len(), 1);
		let field = &output.fields[0];
		assert_eq!(field.key, "value");
		assert!(matches!(field.field_type, SchemaFieldType::Integer));

		// This should work
		let valid_json = r#"{ "value": 42 }"#;
		assert!(output.validate_config(valid_json));

		// This should fail
		let invalid_json = r#"{ "value": "not an int" }"#;
		assert!(!output.validate_config(invalid_json));
	}

	#[test]
	fn test_float_schema() {
		#[derive(JsonSchema)]
		#[allow(dead_code)]
		struct FloatTest {
			value: f64,
		}

		let root_schema = schema_for!(FloatTest);
		let output = ConfigSchema::from(root_schema);

		// Make sure we're getting the expected ConfigSchema values
		assert_eq!(output.fields.len(), 1);
		let field = &output.fields[0];
		assert_eq!(field.key, "value");
		assert!(matches!(field.field_type, SchemaFieldType::Float));

		// This should work
		let valid_json = r#"{ "value": 3.14 }"#;
		assert!(output.validate_config(valid_json));

		// This should fail
		let invalid_json = r#"{ "value": "not a float" }"#;
		assert!(!output.validate_config(invalid_json));
	}

	#[test]
	fn test_complex_schema() {
		#[derive(JsonSchema)]
		#[allow(dead_code)]
		struct ComplexTest {
			name: String,
			age: i32,
			rating: f64,
		}

		let root_schema = schema_for!(ComplexTest);
		let output = ConfigSchema::from(root_schema);

		// Make sure we're getting the expected ConfigSchema values
		assert_eq!(output.fields.len(), 3);
		// name: String
		let name_field = output.fields.iter().find(|f| f.key == "name").unwrap();
		assert!(matches!(name_field.field_type, SchemaFieldType::String));
		// age: Integer
		let age_field = output.fields.iter().find(|f| f.key == "age").unwrap();
		assert!(matches!(age_field.field_type, SchemaFieldType::Integer));
		// rating: Float
		let rating_field = output.fields.iter().find(|f| f.key == "rating").unwrap();
		assert!(matches!(rating_field.field_type, SchemaFieldType::Float));

		// This should work
		let valid_json = r#"{ "name": "Big Slick", "age": 20, "rating": 3.14 }"#;
		assert!(output.validate_config(valid_json));

		// This should fail because the age is a string
		let invalid_json = r#"{ "name": "Big Slick", "age": "Twenty", "rating": 3.14 }"#;
		assert!(!output.validate_config(invalid_json));
	}
}
