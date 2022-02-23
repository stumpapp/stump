use entity::user::{Model as UserModel, UserRole};
use rocket::serde::{Deserialize, Serialize};

#[derive(Default, Clone, Debug, Serialize, Deserialize)]
#[serde(crate = "rocket::serde")]
pub struct AuthenticatedUser {
    pub id: i32,
    pub username: String,
    pub role: UserRole,
}

impl Into<AuthenticatedUser> for UserModel {
    fn into(self) -> AuthenticatedUser {
        AuthenticatedUser {
            id: self.id,
            username: self.username,
            role: self.role,
        }
    }
}
