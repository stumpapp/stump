import { useSmartListQuery } from '@stump/client'
import React, { useEffect } from 'react'
import { Outlet, useParams } from 'react-router'

import { SmartListContext } from './context'

export default function UserSmartListLayout() {
	const { id } = useParams<{ id: string }>()

	const [layout, setLayout] = React.useState<'table' | 'list'>(() => getDefaultLayout())

	useEffect(() => {
		localStorage.setItem(LAYOUT_PREFERENCE_KEY, layout)
	}, [layout])

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
				layout,
				list,
				setLayout,
			}}
		>
			<Outlet />
		</SmartListContext.Provider>
	)
}

const LAYOUT_PREFERENCE_KEY = 'smart-list-layout'

const isLayoutPreference = (value: string): value is 'table' | 'list' =>
	value === 'table' || value === 'list'
const getDefaultLayout = () => {
	const storedLayout = localStorage.getItem(LAYOUT_PREFERENCE_KEY)
	if (storedLayout && isLayoutPreference(storedLayout)) {
		return storedLayout
	}

	return 'table'
}
