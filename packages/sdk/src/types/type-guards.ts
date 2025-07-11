import { UserPermission } from '@stump/graphql'

export const allPermissions = Object.values(UserPermission)

export const isUserPermission = (permission: string): permission is UserPermission =>
	allPermissions.includes(permission as UserPermission)
