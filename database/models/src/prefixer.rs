//! A utility module to prefix columns with table name in a query in order to achieve
//! better nested structure support when doing complex join queries.
//! Taken from https://github.com/SeaQL/sea-orm/discussions/1502

use sea_orm::sea_query::{Alias, IntoIden, SelectExpr, SelectStatement};
use sea_orm::{prelude::*, FromQueryResult};
use sea_orm::{EntityTrait, QueryTrait};

/// A utility struct to prefix columns with table name in a query in order to achieve
/// better nested structure support when doing complex join queries.
pub struct Prefixer<S: QueryTrait<QueryStatement = SelectStatement>> {
	pub selector: S,
}

impl<S: QueryTrait<QueryStatement = SelectStatement>> Prefixer<S> {
	pub fn new(selector: S) -> Self {
		Self { selector }
	}

	pub fn add_columns<T: EntityTrait>(mut self, entity: T) -> Self {
		for col in <T::Column as sea_orm::entity::Iterable>::iter() {
			let alias = format!("{}{}", entity.table_name(), col.to_string()); // we use entity.table_name() as prefix
			self.selector.query().expr(SelectExpr {
				expr: col.select_as(col.into_expr()),
				alias: Some(Alias::new(&alias).into_iden()),
				window: None,
			});
		}
		self
	}

	pub fn add_named_columns<T: ColumnTrait>(
		mut self,
		columns: &[T],
		prefix: &str,
	) -> Self {
		for col in columns {
			let alias = format!("{}{}", prefix, col.to_string());
			self.selector.query().expr(SelectExpr {
				expr: col.select_as(col.into_expr()),
				alias: Some(Alias::new(&alias).into_iden()),
				window: None,
			});
		}
		self
	}
}

/// Parse a model from a query result
pub fn parse_query_to_model<M: FromQueryResult, E: EntityTrait>(
	res: &sea_orm::QueryResult,
) -> Result<M, sea_orm::DbErr> {
	M::from_query_result(res, E::default().table_name())
}

/// Parse an optional model from a query result
pub fn parse_query_to_model_optional<M: FromQueryResult, E: EntityTrait>(
	res: &sea_orm::QueryResult,
) -> Result<Option<M>, sea_orm::DbErr> {
	M::from_query_result_optional(res, E::default().table_name())
}
