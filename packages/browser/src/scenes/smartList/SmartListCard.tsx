import { Card, Spacer, Text } from '@stump/components'
import { FragmentType, graphql, SmartListFilterGroupInput, useFragment } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import pluralize from 'pluralize'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import paths from '@/paths'

import { DEFAULT_META_CACHE_TIME, usePrefetchSmartList, useSmartListMeta } from './graphql'

const LOCALE_BASE_KEY = 'userSmartListsScene.list.card'
const withLocaleKey = (key: string) => `${LOCALE_BASE_KEY}.${key}`

const fragment = graphql(`
	fragment SmartListCard on SmartList {
		id
		description
		filters
		joiner
		name
	}
`)

type Props = {
	data: FragmentType<typeof fragment>
}

export default function SmartListCard({ data }: Props) {
	const { id, name, filters, description } = useFragment(fragment, data)
	const { prefetch } = usePrefetchSmartList()
	const { t } = useLocaleContext()

	const { meta } = useSmartListMeta({
		id,

		/**
		 * I allow a longer cache time because the query on the backend is a bit more expensive than others.
		 * So long as another user does not update the smart list, this should be fine. Updates by the viewer
		 * will invalidate the cache.
		 */
		staleTime: DEFAULT_META_CACHE_TIME,
	})
	/**
	 * A function that renders the meta information for the smart list, if present.
	 * Any invalid meta information is filtered out, and the remaining figures, if any,
	 * are rendered in a string.
	 */
	const renderMeta = () => {
		if (!meta) {
			return null
		}

		const { matchedBooks, matchedSeries, matchedLibraries } = meta

		// TODO: I don't think pluralize supports multiple languages...
		const figures = [
			{ label: t(withLocaleKey('meta.figures.books')), value: matchedBooks },
			{ label: t(withLocaleKey('meta.figures.series')), value: matchedSeries },
			{ label: t(withLocaleKey('meta.figures.library')), value: matchedLibraries },
		].filter(({ value }) => !isNaN(value))

		if (figures.length === 0) {
			return null
		}

		const figureString = figures
			.map(({ label, value }) => `${value} ${pluralize(label, value)}`)
			.join(' • ')

		return (
			<Text variant="muted" size="sm">
				{t(withLocaleKey('meta.matches'))}: {figureString}
			</Text>
		)
	}

	/**
	 * Aggregate the number of filters in the smart list groups
	 */
	const filterCount = useMemo(() => {
		const filtersFromJson = JSON.parse(filters) as Array<SmartListFilterGroupInput>
		return filtersFromJson.reduce((acc, group) => {
			return acc + group.groups.length
		}, 0)
	}, [filters])

	return (
		<Link to={paths.smartList(id)} className="block w-full">
			<Card
				className="flex h-32 w-full flex-col gap-y-4 rounded-lg border-none bg-background-surface p-4 transition-colors duration-150 hover:bg-background-surface-hover/80"
				onMouseEnter={() => prefetch({ id })}
			>
				<div className="flex flex-col gap-y-1.5">
					<Text>{name}</Text>
					<Text variant="muted" size="sm">
						{description}
					</Text>
				</div>

				<Spacer />

				<div className="flex items-center justify-between">
					{renderMeta()}

					<Text variant="muted" size="sm">
						{filterCount} {pluralize('filter', filterCount)}
					</Text>
				</div>
			</Card>
		</Link>
	)
}
