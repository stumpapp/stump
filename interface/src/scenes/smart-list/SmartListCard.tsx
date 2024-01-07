import { prefetchSmartListItems, useSmartListMetaQuery } from '@stump/client'
import { Card, Spacer, Text } from '@stump/components'
import { SmartList } from '@stump/types'
import pluralize from 'pluralize'
import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { match, P } from 'ts-pattern'

import paths from '@/paths'

const DEFAULT_META_CACHE_TIME = 900000 // 15 minutes

type Props = {
	list: SmartList
}

export default function SmartListCard({
	list: {
		id,
		name,
		filters: { groups: filterGroups },
		description,
	},
}: Props) {
	const { meta } = useSmartListMetaQuery({
		/**
		 * I allow a longer cache time because the query on the backend is a bit more expensive than others.
		 * So long as another user does not update the smart list, this should be fine. Updates by the viewer
		 * will invalidate the cache.
		 */
		cacheTime: DEFAULT_META_CACHE_TIME,
		id: id,
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

		const { matched_books, matched_series, matched_libraries } = meta

		const matchedBooks = Number(matched_books)
		const matchedSeries = Number(matched_series)
		const matchedLibraries = Number(matched_libraries)

		const figures = [
			{ label: 'book', value: matchedBooks },
			{ label: 'series', value: matchedSeries },
			{ label: 'library', value: matchedLibraries },
		].filter(({ value }) => !isNaN(value))

		if (figures.length === 0) {
			return null
		}

		const figureString = figures
			.map(({ label, value }) => `${value} ${pluralize(label, value)}`)
			.join(' • ')

		return (
			<Text variant="muted" size="sm">
				Matches: {figureString}
			</Text>
		)
	}

	/**
	 * Aggregate the number of filters in the smart list groups using a match pattern
	 * on the variant of the filter group (and, or, not)
	 */
	const filterCount = useMemo(
		() =>
			filterGroups.reduce((acc, group) => {
				const additive = match(group)
					.with(
						{
							and: P.array(),
						},
						({ and }) => and.length,
					)
					.with(
						{
							or: P.array(),
						},
						({ or }) => or.length,
					)
					.with(
						{
							not: P.array(),
						},
						({ not }) => not.length,
					)
					.otherwise(() => 0)

				return acc + additive
			}, 0),
		[filterGroups],
	)

	return (
		<Link to={paths.smartList(id)} className="block w-full">
			<Card
				className="flex h-32 w-full flex-col gap-y-4 rounded-none border-none bg-background-200 p-4 transition-colors duration-150 first:rounded-t-sm last:rounded-b-sm hover:bg-background-300/80"
				onMouseEnter={() => prefetchSmartListItems(id)}
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
