import { useGraphQL, useSDK } from '@stump/client'
import { graphql } from '@stump/graphql'
import { Book, Library, Rows3 } from 'lucide-react'
import { useCallback, useRef } from 'react'

import { SceneContainer } from '@/components/container'
import GenericEmptyState from '@/components/GenericEmptyState'
import { LibraryGridItem } from '@/components/library'
import { CollectionSceneHeader } from '@/components/sharedLayout'

const query = graphql(`
	query LibrariesScene {
		libraries(pagination: { none: { unpaginated: true } }) {
			nodes {
				id
				...LibraryWebGridItem
			}
		}
		librariesStats {
			seriesCount
			bookCount
		}
	}
`)

export default function LibrariesScene() {
	const { sdk } = useSDK()
	const { data, isLoading } = useGraphQL(query, [sdk.cacheKeys.libraries, 'scene'])

	const libraries = data?.libraries.nodes ?? []

	// This makes sure we do not repeat layout variants if possible:
	//
	// For example, there are only two layouts for libraries with 3 series,
	// and if only the 1st and 3rd libraries have 3 series, then if we used
	// the list index they would have both used the same layout variant
	const layoutRegistry = useRef({
		// The layout variant number (non-modulo) assigned to a library ID
		assignments: new Map<string, number>(),
		// Record the smallest unused layout variant number (non-modulo) for each catagory
		counters: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
	})

	const getLayoutNumber = useCallback((libraryId: string, itemCount: number) => {
		if (itemCount < 1 || itemCount > 5) return undefined

		const { assignments, counters } = layoutRegistry.current

		if (assignments.has(libraryId)) {
			return assignments.get(libraryId)!
		}

		const category = itemCount as 1 | 2 | 3 | 4 | 5
		const layoutNumber = counters[category]
		assignments.set(libraryId, layoutNumber)
		counters[category]++

		return layoutNumber
	}, [])

	const renderContent = () => {
		if (isLoading) return null

		if (!libraries.length) {
			return <GenericEmptyState title="No libraries to display" />
		}

		return (
			<div className="gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 grid grid-cols-1">
				{libraries.map((library) => (
					<LibraryGridItem key={library.id} data={library} getLayoutNumber={getLayoutNumber} />
				))}
			</div>
		)
	}

	return (
		<>
			<CollectionSceneHeader
				title="Libraries"
				docsLink="https://stumpapp.dev/docs/guides/fundamentals/libraries"
				stats={
					data
						? [
								{ key: 'libraries', icon: Library, value: libraries.length },
								{
									key: 'series',
									icon: Rows3,
									value: data.librariesStats.seriesCount,
								},
								{
									key: 'books',
									icon: Book,
									value: data.librariesStats.bookCount,
								},
							]
						: undefined
				}
			/>

			<SceneContainer>{renderContent()}</SceneContainer>
		</>
	)
}
