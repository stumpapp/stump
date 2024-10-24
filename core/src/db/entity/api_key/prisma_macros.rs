use crate::prisma::api_key;

api_key::select!(api_key_user_select {
	id
	short_token
	long_token_hash
	user: select {
		id
		username
		permissions
	}
});
