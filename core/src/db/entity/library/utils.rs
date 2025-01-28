use crate::{
	db::entity::User,
	prisma::{library, user},
};

pub fn apply_library_not_hidden_from_user_filter(user: &User) -> library::WhereParam {
	library::hidden_from_users::none(vec![user::id::equals(user.id.clone())])
}
