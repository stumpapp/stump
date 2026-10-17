use async_graphql::{InputObject, OneofObject};
use models::{
	entity::{media, media_metadata, series, series_metadata},
	shared::ordering::{OrderDirection, OrderingField},
};
use sea_orm::{
	sea_query::{DynIden, Expr, ExprTrait, NullOrdering, SelectStatement, SimpleExpr},
	ColumnTrait, Condition, ModelTrait, Order, QueryOrder, Value,
};

#[derive(InputObject, Clone)]
#[graphql(concrete(name = "MediaOrderByField", params(media::MediaModelOrdering)))]
#[graphql(concrete(name = "SeriesOrderByField", params(series::SeriesModelOrdering)))]
#[graphql(concrete(
	name = "MediaMetadataOrderByField",
	params(media_metadata::MediaMetadataModelOrdering)
))]
#[graphql(concrete(
	name = "SeriesMetadataOrderByField",
	params(series_metadata::SeriesMetadataModelOrdering)
))]
pub struct OrderByField<OrderBy: Send + Sync + async_graphql::InputType> {
	pub field: OrderBy,
	pub direction: OrderDirection,
}

#[derive(OneofObject, Clone)]
pub enum MediaOrderBy {
	Media(OrderByField<media::MediaModelOrdering>),
	Metadata(OrderByField<media_metadata::MediaMetadataModelOrdering>),
}

#[derive(OneofObject, Clone)]
pub enum SeriesOrderBy {
	Series(OrderByField<series::SeriesModelOrdering>),
	Metadata(OrderByField<series_metadata::SeriesMetadataModelOrdering>),
}

impl Default for MediaOrderBy {
	fn default() -> Self {
		MediaOrderBy::Media(OrderByField {
			field: media::MediaModelOrdering::Name,
			direction: OrderDirection::Asc,
		})
	}
}

impl Default for SeriesOrderBy {
	fn default() -> Self {
		SeriesOrderBy::Series(OrderByField {
			field: series::SeriesModelOrdering::Name,
			direction: OrderDirection::Asc,
		})
	}
}

impl MediaOrderBy {
	pub fn default_vec() -> Vec<Self> {
		vec![MediaOrderBy::default()]
	}

	pub fn spec(order_by: &[Self]) -> OrderSpec {
		order_by
			.iter()
			.fold(OrderSpec::new(), |spec, order| match order {
				MediaOrderBy::Media(o) => spec.by(&o.field, o.direction),
				MediaOrderBy::Metadata(o) => spec.by(&o.field, o.direction),
			})
			.then(media::Column::Id, Order::Asc)
		// ^ this Id addition is really just a tie breaker
	}

	/// The row's values for each column of [MediaOrderBy::spec]
	pub fn cursor_values(
		order_by: &[Self],
		row: &media::ModelWithMetadata,
	) -> Vec<Value> {
		let mut values = order_by
			.iter()
			.map(|order| match order {
				MediaOrderBy::Media(o) => row.media.get(o.field.column()),
				MediaOrderBy::Metadata(o) => match &row.metadata {
					Some(metadata) => metadata.get(o.field.column()),
					// no meta = null for any col, the type is just to satisfy the generic
					// and won't matter since it will build as `IS NULL`
					None => Option::<String>::None.into(),
				},
			})
			.collect::<Vec<_>>();
		values.push(row.media.get(media::Column::Id));
		values
	}
}

impl SeriesOrderBy {
	pub fn default_vec() -> Vec<Self> {
		vec![SeriesOrderBy::default()]
	}

	pub fn spec(order_by: &[Self]) -> OrderSpec {
		order_by
			.iter()
			.fold(OrderSpec::new(), |spec, order| match order {
				SeriesOrderBy::Series(o) => spec.by(&o.field, o.direction),
				SeriesOrderBy::Metadata(o) => spec.by(&o.field, o.direction),
			})
			.then(series::Column::Id, Order::Asc)
	}

	/// The row's values for each column of [SeriesOrderBy::spec]
	pub fn cursor_values(
		order_by: &[Self],
		row: &series::ModelWithMetadata,
	) -> Vec<Value> {
		let mut values = order_by
			.iter()
			.map(|order| match order {
				SeriesOrderBy::Series(o) => row.series.get(o.field.column()),
				SeriesOrderBy::Metadata(o) => match &row.metadata {
					Some(metadata) => metadata.get(o.field.column()),
					// no meta = null for any col, the type is just to satisfy the generic
					// and won't matter since it will build as `IS NULL`
					None => Option::<String>::None.into(),
				},
			})
			.collect::<Vec<_>>();
		values.push(row.series.get(series::Column::Id));
		values
	}
}

/// Build an [OrderSpec] from a list of `(column, order)` pairs
macro_rules! order_spec {
	($(($column:expr, $order:expr)),* $(,)?) => {
		$crate::order::OrderSpec::new()$(.then($column, $order))*
	};
}
// ^  the api for spec is awkward and so created an extremely basic macro,
// often columns are of different types per table and so couldn't do e.g.
// new([(col,order)]) etc
pub(crate) use order_spec;

// NOTE: this is, in part, a workaround for https://github.com/SeaQL/sea-orm/issues/2407
//
// also, i must be cursed because i sat here for way too long and could not think of a
// better name for this. i think order spec is fine. just fine

/// An ordered list of table-qualified columns with an order
#[derive(Default)]
pub struct OrderSpec {
	columns: Vec<OrderSpecColumn>,
}

impl OrderSpec {
	pub fn new() -> Self {
		Self::default()
	}

	/// append a column with order to the internal list
	pub fn then<C: ColumnTrait>(mut self, column: C, order: Order) -> Self {
		let (table, column) = column.as_column_ref();
		self.columns.push(OrderSpecColumn {
			table,
			column,
			order,
		});
		self
	}

	/// same as [OrderSpec::then] but for a user-selected field
	pub fn by<F: OrderingField>(self, field: &F, direction: OrderDirection) -> Self {
		self.then(field.column(), direction.into())
	}

	/// apply the ordering to a query, will replace existing order clause(s)
	pub fn apply<Q>(&self, mut query: Q) -> Q
	where
		Q: QueryOrder<QueryStatement = SelectStatement>,
	{
		query.query().clear_order_by();
		for column in &self.columns {
			query = query.order_by_with_nulls(
				column.expr(),
				column.order.clone(),
				NullOrdering::Last,
			);
		}
		query
	}

	/// Returns a expr for rows which sort after the cursor per the ordering
	pub fn sorts_after(&self, cursor_values: &[Value]) -> Condition {
		debug_assert_eq!(
			cursor_values.len(),
			self.columns.len(),
			"cursor values must align with the spec's columns"
		);
		let mut condition = Condition::any();
		for k in (1..=self.columns.len()).rev() {
			let mut term = Condition::all();
			for (column, value) in
				self.columns.iter().zip(cursor_values.iter()).take(k - 1)
			{
				term = term.add(column.eq_expr(value));
			}
			// nothing sorts after null value (they are sorted last) so if null
			// iti s just dropped, which should be sufficient. a potential
			// tie could be resolved with another term
			if let Some(after) =
				self.columns[k - 1].strictly_after_expr(&cursor_values[k - 1])
			{
				term = term.add(after);
				condition = condition.add(term);
			}
		}
		condition
	}
}

/// A single table-qualified column of an [OrderSpec]
struct OrderSpecColumn {
	table: DynIden,
	column: DynIden,
	order: Order,
}

impl OrderSpecColumn {
	fn expr(&self) -> SimpleExpr {
		Expr::col((self.table.clone(), self.column.clone())).into()
	}

	/// `col = value`, or `col IS NULL` when the cursor value is null
	fn eq_expr(&self, value: &Value) -> SimpleExpr {
		if value_is_null(value) {
			self.expr().is_null()
		} else {
			self.expr().eq(value.clone())
		}
	}

	/// Returns a expr for rows which sort after the value per the ordering, which
	/// will be used to get the full condition in [OrderSpec::sorts_after]
	fn strictly_after_expr(&self, value: &Value) -> Option<SimpleExpr> {
		// nulls sorted last = nothing after
		if value_is_null(value) {
			return None;
		}
		let cmp = match &self.order {
			Order::Asc => self.expr().gt(value.clone()),
			Order::Desc => self.expr().lt(value.clone()),
			Order::Field(_) => unimplemented!("OrderSpec does not support Order::Field!"),
			// ^ realistically should never hit and want to fail v loudly
		};
		Some(cmp.or(self.expr().is_null())) // nulls last
	}
}

/// sea-query `Value` does not have an `is_null` but comparing the value when
/// casted to null should be sufficient
fn value_is_null(value: &Value) -> bool {
	value == &value.as_null()
}

#[cfg(test)]
mod tests {
	use super::*;
	use ::tests::{db::test_database, fake_data};
	use sea_orm::{prelude::*, QueryFilter};

	type Row = media::ModelWithMetadata;

	fn series_position_spec() -> OrderSpec {
		order_spec![
			(media_metadata::Column::Number, Order::Asc),
			(media::Column::Name, Order::Asc),
			(media::Column::Id, Order::Asc),
		]
	}

	fn cursor_values(row: &Row) -> Vec<Value> {
		vec![
			row.metadata
				.as_ref()
				.map_or(Option::<Decimal>::None.into(), |m| {
					m.get(media_metadata::Column::Number)
				}),
			row.media.get(media::Column::Name),
			row.media.get(media::Column::Id),
		]
	}

	#[tokio::test]
	async fn order_spec_sorts_and_seeks_with_nulls() {
		let db = test_database().await;
		let library = fake_data::Library::default().insert(&db).await;
		let series = fake_data::Series {
			name: Some("The Murderbot Diaries".to_string()),
			library_id: Some(library.id.clone()),
			..Default::default()
		}
		.insert(&db)
		.await;

		let books = [
			("Exit Strategy", Some(4.0)),
			("Rogue Protocol", Some(3.0)),
			("Platform Decay", Some(8.0)),
			("Fugitive Telemetry", Some(5.0)),
			(
				"Rapport: Friendship, Solidarity, Communion, Empathy",
				Some(6.5),
			),
			("System Collapse", Some(7.0)),
			("All Systems Red", Some(1.0)),
			("Home: Habitat, Range, Niche, Territory", None),
			// ^ rly 4.5 but just for the test
			("Network Effect", Some(6.0)),
			("Compulsory", Some(0.5)),
			("Artificial Condition", Some(2.0)),
		];
		for (name, number) in books {
			fake_data::Media {
				name: Some(name.to_string()),
				metadata: number.map(|num| fake_data::MediaMetadata {
					number: Some(num),
					..Default::default()
				}),
				series_id: series.id.clone(),
				..Default::default()
			}
			.insert(&db)
			.await;
		}

		let spec = series_position_spec();
		let query = || {
			media::ModelWithMetadata::find()
				.filter(media::Column::SeriesId.eq(series.id.clone()))
		};
		let names = |rows: &[Row]| {
			rows.iter()
				.map(|r| r.media.name.clone())
				.collect::<Vec<_>>()
		};

		let ordered = spec
			.apply(query())
			.into_model::<Row>()
			.all(&db)
			.await
			.expect("ordered query failed");

		assert_eq!(
			names(&ordered),
			[
				"Compulsory",
				"All Systems Red",
				"Artificial Condition",
				"Rogue Protocol",
				"Exit Strategy",
				"Fugitive Telemetry",
				"Network Effect",
				"Rapport: Friendship, Solidarity, Communion, Empathy",
				"System Collapse",
				"Platform Decay",
				"Home: Habitat, Range, Niche, Territory",
			]
		);
		// ^ positions asc and nulls last

		let page = spec
			.apply(query().filter(spec.sorts_after(&cursor_values(&ordered[7]))))
			.into_model::<Row>()
			.all(&db)
			.await
			.expect("seek query failed");

		assert_eq!(
			names(&page),
			[
				"System Collapse",
				"Platform Decay",
				"Home: Habitat, Range, Niche, Territory",
			]
		);
		// > 6.5 and then nulls

		let page = spec
			.apply(query().filter(spec.sorts_after(&cursor_values(&ordered[10]))))
			.into_model::<Row>()
			.all(&db)
			.await
			.expect("seek query failed");

		assert!(names(&page).is_empty());
		// nothing = empty obv
	}
}
