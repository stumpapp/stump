import { UserPermission } from '@stump/graphql'
import { Navigate, Outlet } from 'react-router'

import { useCheckPermission } from '../context'

// TODO(permissions): rename to ManageServerRouteWrapper and isolate to single commit or
// at least smaller change, seeing this way too late after other changes
export default function ServerOwnerRouteWrapper() {
	const canManage = useCheckPermission(UserPermission.ManageServer)
	return canManage ? <Outlet /> : <Navigate to=".." replace />
}
