import { useGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import clone from 'lodash/cloneDeep'
import setProperty from 'lodash/set'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, View } from 'react-native'
import { match, P } from 'ts-pattern'

import {
	FilterHeaderButton,
	FilterSheet,
	FilterSheetSearchHeader,
	useFilterListProps,
} from '~/components/filter'
import { FilterSheetRef } from '~/components/filter/FilterSheet'
import { Checkbox, Label, Text } from '~/components/ui'
import { useBookFilterStore } from '~/stores/filters'

import { useBookFilterHeaderContext } from './context'

type SeriesItemProps = {
	item: string
	checked: boolean
	onSelect: (series: string, checked: boolean) => void
}

const SeriesItem = memo(function SeriesItem({ item, checked, onSelect }: SeriesItemProps) {
	return (
		<View className="flex flex-row items-center gap-3 px-7 py-3">
			<Checkbox id={item} checked={checked} onCheckedChange={(c) => onSelect(item, !!c)} />
			<Label htmlFor={item}>{item}</Label>
		</View>
	)
})

const query = graphql(`
	query SeriesMetadata($seriesId: ID) {
		mediaMetadataOverview(seriesId: $seriesId) {
			series
		}
	}
`)

export default function Series() {
	const { seriesId } = useBookFilterHeaderContext()
	const { data, isPending } = useGraphQL(query, ['seriesMetadata', seriesId], { seriesId })

	const seriesList = useMemo(
		() => data?.mediaMetadataOverview?.series ?? [],
		[data?.mediaMetadataOverview?.series],
	)

	const sheetRef = useRef<FilterSheetRef>(null)
	const [searchQuery, setSearchQuery] = useState('')

	const filters = useBookFilterStore((store) => store.filters)
	const setFilters = useBookFilterStore((store) => store.setFilters)

	const seriesFilter = useMemo(
		() => filters.metadata?.series?.likeAnyOf,
		[filters.metadata?.series?.likeAnyOf],
	)

	const [selectionState, setSelectionState] = useState(() => {
		return match(seriesFilter)
			.with(P.array(P.string), (likeAnyOf) =>
				likeAnyOf.reduce(
					(acc, series) => ({ ...acc, [series]: true }),
					{} as Record<string, boolean>,
				),
			)
			.otherwise(() => ({}) as Record<string, boolean>)
	})

	const onSelectSeries = useCallback((series: string, checked: boolean) => {
		setSelectionState((prev) => ({
			...prev,
			[series]: checked,
		}))
	}, [])

	const onSubmitChanges = useCallback(() => {
		const selectedSeries = Object.entries(selectionState)
			.filter(([, isSelected]) => isSelected)
			.map(([series]) => series)

		sheetRef.current?.close()

		if (selectedSeries.length) {
			const adjustedFilters = setProperty(
				clone(filters),
				`metadata.series.likeAnyOf`,
				selectedSeries,
			)
			setFilters(adjustedFilters)
		} else {
			const adjustedFilters = setProperty(clone(filters), `metadata.series`, undefined)
			setFilters(adjustedFilters)
		}
	}, [filters, setFilters, selectionState])

	const isActive =
		!!filters.metadata?.series?.likeAnyOf && filters.metadata.series.likeAnyOf.length > 0

	const filteredSeriesList = useMemo(() => {
		if (!searchQuery.trim()) return seriesList
		const query = searchQuery.toLowerCase()
		return seriesList.filter((series) => series.toLowerCase().includes(query))
	}, [seriesList, searchQuery])

	const filterListProps = useFilterListProps()

	useEffect(() => {
		// Sync local selection state with global filters (in case of external changes, e.g. clear filters)
		const newState = match(seriesFilter)
			.with(P.array(P.string), (likeAnyOf) =>
				likeAnyOf.reduce(
					(acc, series) => ({ ...acc, [series]: true }),
					{} as Record<string, boolean>,
				),
			)
			.otherwise(() => ({}) as Record<string, boolean>)
		setSelectionState(newState)
	}, [seriesFilter])

	const renderItem = useCallback(
		({ item }: { item: string }) => (
			<SeriesItem item={item} checked={selectionState[item] ?? false} onSelect={onSelectSeries} />
		),
		[selectionState, onSelectSeries],
	)

	if (isPending) return null

	return (
		<FilterSheet
			ref={sheetRef}
			label="Series"
			isActive={isActive}
			header={
				<View className="flex flex-row items-center justify-between">
					<FilterHeaderButton icon="x" onPress={() => sheetRef.current?.close()} />

					<Text size="lg" className="font-medium tracking-wide text-foreground-subtle">
						Series
					</Text>

					<FilterHeaderButton icon="check" variant="prominent" onPress={onSubmitChanges} />
				</View>
			}
		>
			{filteredSeriesList.length === 0 ? (
				<Text className="py-8 text-center text-foreground-muted">
					{seriesList.length === 0 ? 'No series found' : 'No matching series'}
				</Text>
			) : (
				<FlatList
					{...filterListProps}
					data={filteredSeriesList}
					keyExtractor={(item) => item}
					renderItem={renderItem}
					stickyHeaderIndices={[0]}
					ListHeaderComponent={
						<FilterSheetSearchHeader
							placeholder="Search series..."
							value={searchQuery}
							onChangeText={setSearchQuery}
						/>
					}
				/>
			)}
		</FilterSheet>
	)
}
