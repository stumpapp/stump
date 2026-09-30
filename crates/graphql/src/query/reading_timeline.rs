use async_graphql::{Context, Object, Result};
use models::{entity::reading_session, shared::ordering::OrderDirection};
use sea_orm::{prelude::*, QueryOrder, QuerySelect};

use crate::{
	data::{AuthContext, CoreContext},
	loader::reading_timeline::sessions_with_events,
	object::reading_timeline::GlobalReadingTimelineNode,
	pagination::{CursorPaginatedResponse, CursorPagination, CursorPaginationInfo},
};

#[derive(Default)]
pub struct ReadingTimelineQuery;

#[Object]
impl ReadingTimelineQuery {
	async fn my_reading_timeline(
		&self,
		ctx: &Context<'_>,
		#[graphql(default)] pagination: CursorPagination,
		#[graphql(default_with = "OrderDirection::Desc")] order: OrderDirection,
	) -> Result<CursorPaginatedResponse<GlobalReadingTimelineNode>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let cursor = pagination
			.after
			.as_deref()
			.and_then(|s| s.parse::<i32>().ok());
		let limit = pagination.limit;

		let mut query = reading_session::Entity::find()
			.filter(reading_session::Column::UserId.eq(&user.id))
			.order_by(reading_session::Column::Id, order.into());
		// ^ ids serial so should be fine to sort by it instead of date
		if let Some(after) = cursor {
			query = query.filter(reading_session::Column::Id.lt(after));
		}

		let mut sessions = query.limit(limit + 1).all(conn).await?;
		sessions.truncate(limit as usize);
		let next_cursor = if sessions.len() as u64 > limit {
			sessions.last().map(|s| s.id.to_string())
		} else {
			None
		};

		if sessions.is_empty() {
			return Ok(CursorPaginatedResponse {
				nodes: vec![],
				cursor_info: CursorPaginationInfo {
					current_cursor: pagination.after.clone(),
					next_cursor: None,
					limit,
				},
			});
		}

		let sessions_with_events =
			sessions_with_events(sessions, order.into(), conn).await?;

		let current_cursor = pagination.after.clone().or_else(|| {
			sessions_with_events
				.first()
				.map(|s| s.session.model.id.to_string())
		});

		Ok(CursorPaginatedResponse {
			nodes: sessions_with_events
				.into_iter()
				.map(GlobalReadingTimelineNode::from)
				.collect(),
			cursor_info: CursorPaginationInfo {
				current_cursor,
				next_cursor,
				limit,
			},
		})
	}
}
