import { smartListApi, smartListQueryKeys } from '@stump/api'
import { useQueries } from '@stump/client'
import React from 'react'
import { useParams } from 'react-router'

export default function UserSmartListScene() {
	const { id } = useParams<{ id: string }>()

	if (!id) {
		throw new Error('This scene requires an ID in the URL')
	}

	const [listResult, itemsResult] = useQueries({
		queries: [
			{
				queryFn: async () => {
					const { data } = await smartListApi.getSmartListById(id)
					return data
				},
				queryKey: [smartListQueryKeys.getSmartListById, id],
			},
			{
				queryFn: async () => {
					const { data } = await smartListApi.getSmartListItems(id)
					return data
				},
				queryKey: [smartListQueryKeys.getSmartListItems, id],
			},
		],
	})

	if (!listResult || !itemsResult) {
		return null
	}

	const { data: list, isLoading: isLoadingList } = listResult
	const { data: items, isLoading: isLoadingItems } = itemsResult

	const shouldThrow = !isLoadingList && !list
	if (shouldThrow) {
		throw new Error('The requested smart list does not exist!')
	}

	const renderItems = () => {
		if (isLoadingItems) {
			return null
		}

		return <pre className="text-xs text-contrast-200">{JSON.stringify({ items }, null, 2)}</pre>
	}

	return (
		<div>
			TODO: smart list things
			{renderItems()}
		</div>
	)
}
