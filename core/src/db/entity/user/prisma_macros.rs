use crate::prisma::user;

user::select!(user_basic_profile_select {
	id
	username
	is_server_owner
	avatar_url
	created_at
});

user::select!(user_password_select {
	id
	username
	hashed_password
});
