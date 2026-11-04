use async_graphql::{Context, Object, Result, ID};
use models::{domain::author::normalize_author_name, entity::author};
use sea_orm::{prelude::*, QueryOrder};

use crate::{
	data::CoreContext,
	filter::{author::AuthorFilterInput, IntoFilter},
	object::author::Author,
	pagination::{
		get_paginated_results, PaginatedResponse, Pagination, PaginationValidator,
	},
};

#[derive(Default)]
pub struct AuthorQuery;

#[Object]
impl AuthorQuery {
	/// Get a single author by ID
	async fn author_by_id(&self, ctx: &Context<'_>, id: ID) -> Result<Author> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let author = author::Entity::find_by_id(id.to_string())
			.one(conn)
			.await?
			.ok_or("Author not found")?;

		Ok(Author::new(author, None))
	}

	/// Get a single author by name
	async fn author_by_name(
		&self,
		ctx: &Context<'_>,
		name: String,
	) -> Result<Option<Author>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let author = author::Entity::find()
			.filter(author::Column::NormalizedName.like(normalize_author_name(&name)))
			.one(conn)
			.await?;

		Ok(author.map(|model| Author::new(model, None)))
	}

	/// Get a paginated list of authors
	async fn authors(
		&self,
		ctx: &Context<'_>,
		#[graphql(default)] filter: AuthorFilterInput,
		// TODO: ordering, at least direction
		#[graphql(default, validator(custom = "PaginationValidator"))]
		pagination: Pagination,
	) -> Result<PaginatedResponse<Author>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let query = author::Entity::find()
			.filter(filter.into_filter())
			.order_by_asc(author::Column::SortName);
		let get_cursor = |a: &author::Model| a.name.clone();

		// TODO: will need to either be a separate handler to inject role
		// or maybe some From impls for different select_also's??
		// or diff resolver? for library specifically we don't care
		// about role, but for series / books we will. a series
		// won't have SO many authors to warrant pagination, nor book,
		// so okay i am overthinking it! i think series/book authors can
		// come from object resolvers, e.g. Series.authors(ctx).await etc

		get_paginated_results(
			query,
			author::Column::SortName,
			conn,
			pagination,
			get_cursor,
		)
		.await
	}
}
