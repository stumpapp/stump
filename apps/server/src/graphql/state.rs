use entity::user::AuthUser;

use crate::config::state::AppState;

pub struct GraphQLData {
	pub ctx: AppState,
}
