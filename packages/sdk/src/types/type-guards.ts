import { UserPermission } from './generated'

export const allPermissions = [
	'bookclub:read',
	'bookclub:create',
	'email:arbitrary_send',
	'email:send',
	'emailer:create',
	'emailer:manage',
	'emailer:read',
	'feature:api_keys',
	'feature:koreader_sync',
	'file:explorer',
	'file:upload',
	'file:download',
	'library:create',
	'library:edit',
	'library:scan',
	'library:manage',
	'library:delete',
	'user:read',
	'user:manage',
	'server:manage',
	'smartlist:read',
	'notifier:read',
	'notifier:create',
	'notifier:delete',
	'notifier:manage',
] as UserPermission[]

export const isUserPermission = (permission: string): permission is UserPermission =>
	allPermissions.includes(permission as UserPermission)
