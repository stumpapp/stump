declare enum UserRole {
	ServerOwner = 'SERVER_OWNER',
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
	/**
	 * The user preferences associated with this account. Will be undefined only if the relation is not loaded.
	 */
	preferences?: UserPreferences;
}

interface UserCredentials {
	username: string;
	password: string;
}
