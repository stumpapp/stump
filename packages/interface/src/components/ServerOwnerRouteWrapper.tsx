import React from 'react'
import { Navigate, Outlet } from 'react-router'

import { useAppContext } from '../context'

export default function ServerOwnerRouteWrapper() {
	const { isServerOwner } = useAppContext()

	return isServerOwner ? <Outlet /> : <Navigate to=".." replace />
}
