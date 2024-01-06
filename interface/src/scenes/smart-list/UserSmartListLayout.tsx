import { useSmartListQuery } from '@stump/client'
import React from 'react'
import { Outlet, useParams } from 'react-router'

import { SmartListContext } from './context'

export default function UserSmartListLayout() {
	const { id } = useParams<{ id: string }>()

	if (!id) {
		throw new Error('This scene requires an ID in the URL')
	}

	const { list, isLoading } = useSmartListQuery({ id })

	if (isLoading) {
		return null
	}

	// TODO: redirect for these?
	if (!list) {
		throw new Error('The requested smart list does not exist!')
	}

	return (
		<SmartListContext.Provider
			value={{
				list,
			}}
		>
			<Outlet />
		</SmartListContext.Provider>
	)
}
