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

type CoverArtistItemProps = {
	item: string
	checked: boolean
	onSelect: (coverArtist: string, checked: boolean) => void
}

const CoverArtistItem = memo(function CoverArtistItem({
	item,
	checked,
	onSelect,
}: CoverArtistItemProps) {
	return (
		<View className="flex flex-row items-center gap-3 px-7 py-3">
			<Checkbox id={item} checked={checked} onCheckedChange={(c) => onSelect(item, !!c)} />
			<Label htmlFor={item}>{item}</Label>
		</View>
	)
})

const query = graphql(`
	query CoverArtists($seriesId: ID) {
		mediaMetadataOverview(seriesId: $seriesId) {
			coverArtists
		}
	}
`)

export default function CoverArtists() {
	const { seriesId } = useBookFilterHeaderContext()
	const { data, isPending } = useGraphQL(query, ['coverArtists', seriesId], { seriesId })

	const coverArtists = useMemo(
		() => data?.mediaMetadataOverview?.coverArtists ?? [],
		[data?.mediaMetadataOverview?.coverArtists],
	)

	const sheetRef = useRef<FilterSheetRef>(null)
	const [searchQuery, setSearchQuery] = useState('')

	const filters = useBookFilterStore((store) => store.filters)
	const setFilters = useBookFilterStore((store) => store.setFilters)

	const coverArtistFilter = useMemo(
		() => filters.metadata?.coverArtists?.likeAnyOf,
		[filters.metadata?.coverArtists?.likeAnyOf],
	)

	const [selectionState, setSelectionState] = useState(() => {
		return match(coverArtistFilter)
			.with(P.array(P.string), (likeAnyOf) =>
				likeAnyOf.reduce(
					(acc, coverArtist) => ({ ...acc, [coverArtist]: true }),
					{} as Record<string, boolean>,
				),
			)
			.otherwise(() => ({}) as Record<string, boolean>)
	})

	const onSelectCoverArtist = useCallback((coverArtist: string, checked: boolean) => {
		setSelectionState((prev) => ({
			...prev,
			[coverArtist]: checked,
		}))
	}, [])

	const onSubmitChanges = useCallback(() => {
		const selectedCoverArtists = Object.entries(selectionState)
			.filter(([, isSelected]) => isSelected)
			.map(([coverArtist]) => coverArtist)

		sheetRef.current?.close()

		if (selectedCoverArtists.length) {
			const adjustedFilters = setProperty(
				clone(filters),
				`metadata.coverArtists.likeAnyOf`,
				selectedCoverArtists,
			)
			setFilters(adjustedFilters)
		} else {
			const adjustedFilters = setProperty(clone(filters), `metadata.coverArtists`, undefined)
			setFilters(adjustedFilters)
		}
	}, [filters, setFilters, selectionState])

	const isActive =
		!!filters.metadata?.coverArtists?.likeAnyOf &&
		filters.metadata.coverArtists.likeAnyOf.length > 0

	const filteredCoverArtists = useMemo(() => {
		if (!searchQuery.trim()) return coverArtists
		const query = searchQuery.toLowerCase()
		return coverArtists.filter((coverArtist) => coverArtist.toLowerCase().includes(query))
	}, [coverArtists, searchQuery])

	const filterListProps = useFilterListProps()

	useEffect(() => {
		const newState = match(coverArtistFilter)
			.with(P.array(P.string), (likeAnyOf) =>
				likeAnyOf.reduce(
					(acc, coverArtist) => ({ ...acc, [coverArtist]: true }),
					{} as Record<string, boolean>,
				),
			)
			.otherwise(() => ({}) as Record<string, boolean>)
		setSelectionState(newState)
	}, [coverArtistFilter])

	const renderItem = useCallback(
		({ item }: { item: string }) => (
			<CoverArtistItem
				item={item}
				checked={selectionState[item] ?? false}
				onSelect={onSelectCoverArtist}
			/>
		),
		[selectionState, onSelectCoverArtist],
	)

	if (isPending) return null

	return (
		<FilterSheet
			ref={sheetRef}
			label="Cover Artists"
			isActive={isActive}
			header={
				<View className="flex flex-row items-center justify-between">
					<FilterHeaderButton icon="x" onPress={() => sheetRef.current?.close()} />

					<Text size="lg" className="font-medium tracking-wide text-foreground-subtle">
						Cover Artists
					</Text>

					<FilterHeaderButton icon="check" variant="prominent" onPress={onSubmitChanges} />
				</View>
			}
		>
			{filteredCoverArtists.length === 0 ? (
				<Text className="py-8 text-center text-foreground-muted">
					{coverArtists.length === 0 ? 'No cover artists found' : 'No matching cover artists'}
				</Text>
			) : (
				<FlatList
					{...filterListProps}
					data={filteredCoverArtists}
					keyExtractor={(item) => item}
					renderItem={renderItem}
					stickyHeaderIndices={[0]}
					ListHeaderComponent={
						<FilterSheetSearchHeader
							placeholder="Search cover artists..."
							value={searchQuery}
							onChangeText={setSearchQuery}
						/>
					}
				/>
			)}
		</FilterSheet>
	)
}
