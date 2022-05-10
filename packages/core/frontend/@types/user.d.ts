declare enum UserRole {
	Owner = 'OWNER',
	Member = 'MEMBER',
}

// No password field intentionally
interface User {
	/**
	 * The id of the user.
	 */
	id: string;
	/**
	 * The username of the user.
	 */
	username: string;
	/**
	 * The role of the user.
	 */
	role: UserRole;
}

interface UserCredentials {
	username: string;
	password: string;
}
