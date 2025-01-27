//! This module defines some utility functions for parsing a [`schemars::schema_for!`] output into a type,
// [`SchemaOutput`], for transmission to the frontend to allow config options to be rendered.
use schemars::schema::{InstanceType, RootSchema, Schema, SchemaObject, SingleOrVec};

#[derive(Debug)]
pub struct SchemaOutput {
	pub fields: Vec<SchemaField>,
}

#[derive(Debug)]
pub struct SchemaField {
	pub key: String,
	pub field_type: SchemaFieldType,
}

#[derive(Debug)]
pub enum SchemaFieldType {
	Integer,
	Float,
	String,
}

pub fn parse_schema(schema: RootSchema) -> SchemaOutput {
	// Get the object validation part of the schema object
	let obj_validation = schema
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
				})
			}
		}
	}

	SchemaOutput { fields }
}

fn extract_field_type(obj: &SchemaObject) -> Option<SchemaFieldType> {
	if let Some(instance_types) = &obj.instance_type {
		let types = match instance_types {
			SingleOrVec::Single(single) => vec![*single.clone()],
			SingleOrVec::Vec(vec) => vec.to_vec(),
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

	todo!()
}

#[cfg(test)]
mod tests {
	use super::*;
	use schemars::{schema_for, JsonSchema};

	#[test]
	fn test_string_struct() {
		#[derive(JsonSchema)]
		#[allow(dead_code)]
		struct StringTest {
			my_str: String,
		}

		let root_schema = schema_for!(StringTest);
		let output = parse_schema(root_schema);

		assert_eq!(output.fields.len(), 1);
		let field = &output.fields[0];
		assert_eq!(field.key, "my_str");
		assert!(matches!(field.field_type, SchemaFieldType::String));
	}

	#[test]
	fn test_int_struct() {
		#[derive(JsonSchema)]
		#[allow(dead_code)]
		struct IntTest {
			my_int: i32,
		}

		let root_schema = schema_for!(IntTest);
		let output = parse_schema(root_schema);

		assert_eq!(output.fields.len(), 1);
		let field = &output.fields[0];
		assert_eq!(field.key, "my_int");
		assert!(matches!(field.field_type, SchemaFieldType::Integer));
	}

	#[test]
	fn test_float_struct() {
		#[derive(JsonSchema)]
		#[allow(dead_code)]
		struct FloatTest {
			my_float: f64,
		}

		let root_schema = schema_for!(FloatTest);
		let output = parse_schema(root_schema);

		assert_eq!(output.fields.len(), 1);
		let field = &output.fields[0];
		assert_eq!(field.key, "my_float");
		assert!(matches!(field.field_type, SchemaFieldType::Float));
	}

	#[test]
	fn test_complex_struct() {
		#[derive(JsonSchema)]
		#[allow(dead_code)]
		struct ComplexTest {
			name: String,
			age: i32,
			rating: f64,
		}

		let root_schema = schema_for!(ComplexTest);
		let output = parse_schema(root_schema);

		assert_eq!(output.fields.len(), 3);

		let name_field = output.fields.iter().find(|f| f.key == "name").unwrap();
		assert!(matches!(name_field.field_type, SchemaFieldType::String));

		let age_field = output.fields.iter().find(|f| f.key == "age").unwrap();
		assert!(matches!(age_field.field_type, SchemaFieldType::Integer));

		let rating_field = output.fields.iter().find(|f| f.key == "rating").unwrap();
		assert!(matches!(rating_field.field_type, SchemaFieldType::Float));
	}
}
