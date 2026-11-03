import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { Book, Library, Rows3 } from 'lucide-react'

import { CollectionGridItem } from '@/components/collection'
import { useTranslate } from '@/hooks/useTranslate'
import { usePaths } from '@/paths'

import { usePrefetchSmartList } from './graphql'

const fragment = graphql(`
	fragment SmartListWebGridItem on SmartList {
		id
		name
		books(limit: 5) {
			thumbnail {
				url
				metadata {
					averageColor
					colors {
						color
						percentage
					}
					thumbhash
				}
			}
		}
		meta {
			matchedBooks
			matchedSeries
			matchedLibraries
		}
	}
`)

type Props = {
	data: FragmentType<typeof fragment>
	getLayoutNumber: (id: string, itemCount: number) => number | undefined
}

export default function SmartListGridItem({ data, getLayoutNumber }: Props) {
	const paths = usePaths()
	const { translate } = useTranslate()
	const { prefetch } = usePrefetchSmartList()
	const { id, name, books, meta } = useFragment(fragment, data)

	const layoutNumber = getLayoutNumber(id, books.length)

	return (
		<CollectionGridItem
			title={name}
			to={paths.smartList(id)}
			onHover={() => prefetch({ id })}
			thumbnails={books.map(({ thumbnail }) => ({
				url: thumbnail.url,
				metadata: thumbnail.metadata,
			}))}
			layoutNumber={layoutNumber}
			stats={[
				{
					key: 'libraries',
					icon: Library,
					value: meta.matchedLibraries,
					label: translate('shared.common.libraries', { count: meta.matchedLibraries }),
				},
				{
					key: 'series',
					icon: Rows3,
					value: meta.matchedSeries,
					label: translate('shared.common.series', { count: meta.matchedSeries }),
				},
				{
					key: 'books',
					icon: Book,
					value: meta.matchedBooks,
					label: translate('shared.common.book', { count: meta.matchedBooks }),
				},
			]}
		/>
	)
}
