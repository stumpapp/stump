import { useGraphQL, useSDK } from '@stump/client'
import { graphql } from '@stump/graphql'
import { ListFilter } from 'lucide-react'
import { useCallback, useRef } from 'react'

import { SceneContainer } from '@/components/container'
import GenericEmptyState from '@/components/GenericEmptyState'
import { CollectionSceneHeader } from '@/components/sharedLayout'
import { useTranslate } from '@/hooks/useTranslate'

import SmartListGridItem from './SmartListGridItem'

const LOCALE_BASE_KEY = `userSmartListsScene`
const withLocaleKey = (key: string) => `${LOCALE_BASE_KEY}.${key}`

const query = graphql(`
	query SmartListsWithSearch($input: SmartListsInput!) {
		smartLists(input: $input) {
			id
			...SmartListWebGridItem
		}
	}
`)

export default function UserSmartListsScene() {
	const { t, translate } = useTranslate()
	const { sdk } = useSDK()
	const { data, isLoading } = useGraphQL(query, [sdk.cacheKeys.smartLists, 'scene'], {
		input: {},
	})

	const smartLists = data?.smartLists ?? []

	// This makes sure we do not repeat layout variants if possible:
	//
	// For example, there are only two layouts for lists with 3 books,
	// and if only the 1st and 3rd lists have 3 books, then if we used
	// the list index they would have both used the same layout variant
	const layoutRegistry = useRef({
		// The layout variant number (non-modulo) assigned to a smart list ID
		assignments: new Map<string, number>(),
		// Record the smallest unused layout variant number (non-modulo) for each catagory
		counters: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
	})

	const getLayoutNumber = useCallback((smartListId: string, itemCount: number) => {
		if (itemCount < 1 || itemCount > 5) return undefined

		const { assignments, counters } = layoutRegistry.current

		if (assignments.has(smartListId)) {
			return assignments.get(smartListId)!
		}

		const category = itemCount as 1 | 2 | 3 | 4 | 5
		const layoutNumber = counters[category]
		assignments.set(smartListId, layoutNumber)
		counters[category]++

		return layoutNumber
	}, [])

	const renderContent = () => {
		if (isLoading) return null

		if (!smartLists.length) {
			return (
				<GenericEmptyState
					title={t(withLocaleKey('list.emptyState.heading'))}
					subtitle={t(withLocaleKey('list.emptyState.noListsMessage'))}
				/>
			)
		}

		return (
			<div className="gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 grid grid-cols-1">
				{smartLists.map((list) => (
					<SmartListGridItem key={list.id} data={list} getLayoutNumber={getLayoutNumber} />
				))}
			</div>
		)
	}

	return (
		<>
			<CollectionSceneHeader
				title={translate('shared.common.smartLists')}
				docsLink="https://stumpapp.dev/docs/guides/features/smart-list"
				stats={data ? [{ key: 'lists', icon: ListFilter, value: smartLists.length }] : undefined}
			/>

			<SceneContainer>{renderContent()}</SceneContainer>
		</>
	)
}
