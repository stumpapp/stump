use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::{
	db::entity::User,
	prisma::{book_club, book_club_invitation, book_club_member},
};

use super::{
	book_club_member_and_schedule_include, book_club_member_user_username,
	book_club_with_books_include, BookClubMember, BookClubMemberRoleSpec,
	BookClubSchedule,
};

#[derive(Default, Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct BookClub {
	id: String,
	name: String,
	description: Option<String>,
	emoji: Option<String>,
	is_private: bool,
	created_at: String,
	member_role_spec: BookClubMemberRoleSpec,

	#[serde(skip_serializing_if = "Option::is_none")]
	members: Option<Vec<BookClubMember>>,
	#[serde(skip_serializing_if = "Option::is_none")]
	schedule: Option<BookClubSchedule>,
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct BookClubInvitation {
	id: String,

	#[serde(skip_serializing_if = "Option::is_none")]
	pub user: Option<User>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub book_club: Option<BookClub>,
}

impl From<book_club::Data> for BookClub {
	fn from(data: book_club::Data) -> BookClub {
		let members = data.members().ok().map(|members| {
			members
				.iter()
				.cloned()
				.map(BookClubMember::from)
				.collect::<Vec<BookClubMember>>()
		});

		let schedule = data
			.schedule()
			.ok()
			.flatten()
			.cloned()
			.map(BookClubSchedule::from);

		let member_role_spec = data
			.member_role_spec
			.map(BookClubMemberRoleSpec::from)
			.unwrap_or_default();

		BookClub {
			id: data.id,
			name: data.name,
			description: data.description,
			emoji: data.emoji,
			is_private: data.is_private,
			created_at: data.created_at.to_rfc3339(),
			members,
			schedule,
			member_role_spec,
		}
	}
}

impl From<book_club_member_user_username::Data> for BookClub {
	fn from(data: book_club_member_user_username::Data) -> BookClub {
		let members = data
			.members
			.into_iter()
			.map(BookClubMember::from)
			.collect::<Vec<BookClubMember>>();
		let member_role_spec = data
			.member_role_spec
			.map(BookClubMemberRoleSpec::from)
			.unwrap_or_default();

		BookClub {
			id: data.id,
			name: data.name,
			description: data.description,
			emoji: data.emoji,
			is_private: data.is_private,
			created_at: data.created_at.to_rfc3339(),
			members: Some(members),
			member_role_spec,
			..Default::default()
		}
	}
}

impl From<book_club_member_and_schedule_include::Data> for BookClub {
	fn from(data: book_club_member_and_schedule_include::Data) -> BookClub {
		let members = data
			.members
			.into_iter()
			.map(BookClubMember::from)
			.collect::<Vec<BookClubMember>>();
		let member_role_spec = data
			.member_role_spec
			.map(BookClubMemberRoleSpec::from)
			.unwrap_or_default();

		BookClub {
			id: data.id,
			name: data.name,
			description: data.description,
			emoji: data.emoji,
			created_at: data.created_at.to_rfc3339(),
			is_private: data.is_private,
			members: Some(members),
			member_role_spec,
			..Default::default()
		}
	}
}

impl From<book_club_with_books_include::Data> for BookClub {
	fn from(data: book_club_with_books_include::Data) -> BookClub {
		let members = data
			.members
			.into_iter()
			.map(BookClubMember::from)
			.collect::<Vec<BookClubMember>>();

		let schedule = data.schedule.map(BookClubSchedule::from);
		let member_role_spec = data
			.member_role_spec
			.map(BookClubMemberRoleSpec::from)
			.unwrap_or_default();

		BookClub {
			id: data.id,
			name: data.name,
			description: data.description,
			emoji: data.emoji,
			is_private: data.is_private,
			created_at: data.created_at.to_rfc3339(),
			members: Some(members),
			schedule,
			member_role_spec,
		}
	}
}

impl From<book_club_member::Data> for BookClubMember {
	fn from(data: book_club_member::Data) -> BookClubMember {
		// TODO: relations
		BookClubMember {
			id: data.id,
			display_name: data.display_name,
			is_creator: data.is_creator,
			hide_progress: data.hide_progress,
			private_membership: data.private_membership,
			role: data.role.into(),
			..Default::default()
		}
	}
}

impl From<book_club_invitation::Data> for BookClubInvitation {
	fn from(data: book_club_invitation::Data) -> BookClubInvitation {
		let user = data.user().ok().cloned().map(User::from);
		let book_club = data.book_club().ok().cloned().map(BookClub::from);
		BookClubInvitation {
			id: data.id,
			user,
			book_club,
		}
	}
}
