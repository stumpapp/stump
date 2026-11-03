use async_graphql::{Context, Object, Result};
use models::{
	entity::reading_session, services::reading_timeline::sessions_with_events,
	shared::ordering::OrderDirection,
};
use sea_orm::{prelude::*, QuerySelect};

use crate::{
	data::{AuthContext, CoreContext},
	object::reading_timeline::{GlobalReadingTimelineNode, SessionWithEvents},
	order::order_spec,
	pagination::{CursorPaginatedResponse, CursorPagination, CursorPaginationInfo},
};

#[derive(Default)]
pub struct ReadingTimelineQuery;

#[Object]
impl ReadingTimelineQuery {
	/// A paginated list of reading sessions and events for the authenticated user,
	/// for all reading activity across all books
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

		let spec = order_spec![
			(reading_session::Column::CreatedAt, order.into()),
			(reading_session::Column::Id, order.into()),
		];
		// ^ note for posterity: originally i only sorted by ids because i was really only
		// considering the happy path of sessions are created sequentially as you read
		// in stump readers. this ofc is not true when considering any kind of external
		// sync, even for stump offline-to-online sync, because session creation is
		// not strictly ordered during those mutations. id sort is now just a fallback
		// if the stamps are eq
		//
		// note though if you are a long-time stumper like me and have gone through the
		// pre-0.1.0 migration then it might be a little funky. some dates might be
		// the "default" start time of january 1970 lol from a previous migration which
		// redid the repr of sessions

		let mut query = spec.apply(
			reading_session::Entity::find()
				.filter(reading_session::Column::UserId.eq(&user.id)),
		);

		if let Some(after) = cursor {
			let anchor = reading_session::Entity::find_by_id(after)
				.filter(reading_session::Column::UserId.eq(&user.id))
				.one(conn)
				.await?;

			match anchor {
				Some(anchor) => {
					query = query.filter(spec.sorts_after(&[
						anchor.get(reading_session::Column::CreatedAt),
						anchor.get(reading_session::Column::Id),
					]));
				},
				// this realistically shouldn't happen, a deleted session shouldn't be the cursor but
				// in the event it does just fall back to id filtering
				None => {
					query = query.filter(match order {
						OrderDirection::Asc => reading_session::Column::Id.gt(after),
						OrderDirection::Desc => reading_session::Column::Id.lt(after),
					});
				},
			}
		}

		let sessions = query.limit(limit).all(conn).await?;
		let next_cursor = match sessions.last().map(|s| s.id.to_string()) {
			Some(id) if sessions.len() == pagination.limit as usize => Some(id),
			_ => None,
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

		let sessions_with_events = sessions_with_events(sessions, order.into(), conn)
			.await?
			.into_iter()
			.map(|s| SessionWithEvents::from_service(s, order))
			.collect::<Vec<_>>();

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
