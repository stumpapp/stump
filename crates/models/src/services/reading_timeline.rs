use std::collections::HashMap;

use sea_orm::{prelude::*, DatabaseConnection, Order, QueryOrder};

use crate::entity::{bookmark, media_annotation, reading_session};

pub type ServiceSessionWithEvents = (
	reading_session::Model,
	Vec<bookmark::Model>,
	Vec<media_annotation::Model>,
);

pub async fn sessions_with_events(
	sessions: Vec<reading_session::Model>,
	order: Order,
	conn: &DatabaseConnection,
) -> Result<Vec<ServiceSessionWithEvents>, sea_orm::DbErr> {
	let session_ids = sessions.iter().map(|s| s.id).collect::<Vec<_>>();

	let mut session_id_to_bookmarks = bookmark::Entity::find()
		.filter(bookmark::Column::SessionId.is_in(session_ids.clone()))
		// ^ we don't need to filter by user/media since the sessions themselves
		// have already been filtered as such
		.order_by(bookmark::Column::CreatedAt, order.clone())
		.all(conn)
		.await?
		.into_iter()
		.fold(HashMap::new(), |mut acc, bookmark| {
			if let Some(session_id) = bookmark.session_id {
				acc.entry(session_id)
					.or_insert_with(Vec::new)
					.push(bookmark);
			}
			acc
		});

	let mut session_id_to_annotations = media_annotation::Entity::find()
		.filter(media_annotation::Column::SessionId.is_in(session_ids.clone()))
		.order_by(media_annotation::Column::CreatedAt, order.clone())
		.all(conn)
		.await?
		.into_iter()
		.fold(HashMap::new(), |mut acc, annotation| {
			if let Some(session_id) = annotation.session_id {
				acc.entry(session_id)
					.or_insert_with(Vec::new)
					.push(annotation);
			}
			acc
		});

	let sessions_with_events = sessions
		.into_iter()
		.map(|session| {
			let bookmarks = session_id_to_bookmarks
				.remove(&session.id)
				.unwrap_or_default();
			let annotations = session_id_to_annotations
				.remove(&session.id)
				.unwrap_or_default();
			(session, bookmarks, annotations)
		})
		.collect::<Vec<_>>();

	Ok(sessions_with_events)
}
