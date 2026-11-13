use models::{
	entity::book_club_member,
	shared::{book_club::BookClubMemberRole, enums::UserPermission},
};
use sea_orm::EntityTrait;
use tests::fake_data;

use crate::common::{TestApp, account::CreateTestUser};

// TODO(clubs): split this up once i actually build out book club features

/// an admin can only remove members of the club(s) which they are actually admins for
#[tokio::test]
async fn test_admin_cannot_remove_member_from_another_book_club() {
	let app = TestApp::new_with_default_user().await;
	let admin = CreateTestUser {
		username: "admin".to_string(),
		permissions: vec![UserPermission::AccessBookClub],
		..Default::default()
	}
	.insert(&app)
	.await;

	let member = CreateTestUser {
		username: "member".to_string(),
		..Default::default()
	}
	.insert(&app)
	.await;

	for id in ["club-biz", "club-baz"] {
		fake_data::BookClub {
			id: Some(id.to_string()),
			is_private: true,
			..Default::default()
		}
		.insert(app.conn())
		.await;
	}

	fake_data::BookClubMember {
		id: Some("admin-membership-biz".to_string()),
		user_id: admin.id.clone(),
		book_club_id: "club-biz".to_string(),
		role: BookClubMemberRole::Admin,
		..Default::default()
	}
	.insert(app.conn())
	.await;
	fake_data::BookClubMember {
		id: Some("member-membership-baz".to_string()),
		user_id: member.id.clone(),
		book_club_id: "club-baz".to_string(),
		role: BookClubMemberRole::Member,
		..Default::default()
	}
	.insert(app.conn())
	.await;

	let response = app
		.execute_gql_with_token(
			r#"mutation {
				removeBookClubMember(bookClubId: "club-biz", memberId: "member-membership-baz") {
					id
				}
			}"#,
			None,
			&admin.token,
		)
		.await;

	assert!(
		response.get("errors").is_some(),
		"should not have let me remove: {response:#}"
	);

	let untouched_membership =
		book_club_member::Entity::find_by_id("member-membership-baz")
			.one(app.conn())
			.await
			.expect("failed to query member membership");
	assert!(untouched_membership.is_some());
}

/// a user who is not a member of a private book club should not have access to
/// its book nor discussions
#[tokio::test]
async fn test_non_member_cannot_read_private_book_or_its_discussions() {
	let app = TestApp::new_with_default_user().await;

	let outsider = CreateTestUser {
		username: "outsider".to_string(),
		permissions: vec![UserPermission::AccessBookClub],
		..Default::default()
	}
	.insert(&app)
	.await;

	fake_data::BookClub {
		id: Some("private-club".to_string()),
		is_private: true,
		..Default::default()
	}
	.insert(app.conn())
	.await;
	fake_data::BookClubBook {
		id: Some("private-book".to_string()),
		title: Some("Too Tired For Name".to_string()),
		author: Some("AGHH".to_string()),
		book_club_id: "private-club".to_string(),
		..Default::default()
	}
	.insert(app.conn())
	.await;
	fake_data::BookClubDiscussion {
		id: Some("private-discussion".to_string()),
		title: Some("Too Tired For Discussion Name".to_string()),
		book_club_book_id: Some("private-book".to_string()),
		book_club_id: "private-club".to_string(),
		..Default::default()
	}
	.insert(app.conn())
	.await;

	let response = app
		.execute_gql_with_token(
			r#"query {
				bookClubBook(id: "private-book") {
					id
					title
					discussions { id displayName }
				}
			}"#,
			None,
			&outsider.token,
		)
		.await;

	assert!(
		response.get("errors").is_some(),
		"should not have worked: {response:#}"
	);
}

/// a member still requires the feature enablement permission to interact with the API
#[tokio::test]
async fn test_book_club_graphql_requires_access_book_club_permission() {
	let app = TestApp::new_with_default_user().await;
	let user = CreateTestUser {
		username: "no-club-access".to_string(),
		// no permission :(
		..Default::default()
	}
	.insert(&app)
	.await;

	fake_data::BookClub {
		id: Some("club".to_string()),
		is_private: true,
		..Default::default()
	}
	.insert(app.conn())
	.await;
	fake_data::BookClubMember {
		id: Some("has-been-member".to_string()),
		user_id: user.id.clone(),
		book_club_id: "club".to_string(),
		role: BookClubMemberRole::Admin,
		..Default::default()
	}
	.insert(app.conn())
	.await;

	let response = app
		.execute_gql_with_token(r#"query { bookClubs { id } }"#, None, &user.token)
		.await;
	assert!(
		response.get("errors").is_some(),
		"should not have worked: {response:#}"
	);

	let response = app
		.execute_gql_with_token(
			r#"mutation {
				updateBookClub(id: "club", input: { name: "Updated" }) { id }
			}"#,
			None,
			&user.token,
		)
		.await;
	assert!(
		response.get("errors").is_some(),
		"def should not have worked: {response:#}"
	);
}
