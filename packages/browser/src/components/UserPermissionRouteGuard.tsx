import { UserPermission } from '@stump/graphql'
import { Navigate, Outlet } from 'react-router'

import { useAppContext } from '../context'

type Props = {
	permissions: UserPermission[]
	enforceAll?: boolean
}

export default function UserPermissionRouteGuard({ permissions, enforceAll = true }: Props) {
	const { checkPermission } = useAppContext()

	const hasPermission = enforceAll
		? permissions.every((permission) => checkPermission(permission))
		: permissions.some((permission) => checkPermission(permission))

	return hasPermission ? <Outlet /> : <Navigate to=".." replace />
}
