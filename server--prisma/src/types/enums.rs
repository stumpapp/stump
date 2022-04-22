pub enum UserRole {
    ServerOwner,
    Member,
}

impl Default for UserRole {
    fn default() -> Self {
        UserRole::Member
    }
}

impl Into<String> for UserRole {
    fn into(self) -> String {
        match self {
            UserRole::ServerOwner => "SERVER_OWNER".to_string(),
            UserRole::Member => "MEMBER".to_string(),
        }
    }
}
