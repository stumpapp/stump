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

type GenreItemProps = {
	item: string
	checked: boolean
	onSelect: (genre: string, checked: boolean) => void
}

const GenreItem = memo(function GenreItem({ item, checked, onSelect }: GenreItemProps) {
	return (
		<View className="flex flex-row items-center gap-3 px-7 py-3">
			<Checkbox id={item} checked={checked} onCheckedChange={(c) => onSelect(item, !!c)} />
			<Label htmlFor={item}>{item}</Label>
		</View>
	)
})

const query = graphql(`
	query Genres($seriesId: ID) {
		mediaMetadataOverview(seriesId: $seriesId) {
			genres
		}
	}
`)

export default function Genres() {
	const { seriesId } = useBookFilterHeaderContext()
	const { data, isPending } = useGraphQL(query, ['genres', seriesId], { seriesId })

	const genres = useMemo(
		() => data?.mediaMetadataOverview?.genres ?? [],
		[data?.mediaMetadataOverview?.genres],
	)

	const sheetRef = useRef<FilterSheetRef>(null)
	const [searchQuery, setSearchQuery] = useState('')

	const filters = useBookFilterStore((store) => store.filters)
	const setFilters = useBookFilterStore((store) => store.setFilters)

	const genreFilter = useMemo(
		() => filters.metadata?.genres?.likeAnyOf,
		[filters.metadata?.genres?.likeAnyOf],
	)

	const [selectionState, setSelectionState] = useState(() => {
		return match(genreFilter)
			.with(P.array(P.string), (likeAnyOf) =>
				likeAnyOf.reduce(
					(acc, genre) => ({ ...acc, [genre]: true }),
					{} as Record<string, boolean>,
				),
			)
			.otherwise(() => ({}) as Record<string, boolean>)
	})

	const onSelectGenre = useCallback((genre: string, checked: boolean) => {
		setSelectionState((prev) => ({
			...prev,
			[genre]: checked,
		}))
	}, [])

	const onSubmitChanges = useCallback(() => {
		const selectedGenres = Object.entries(selectionState)
			.filter(([, isSelected]) => isSelected)
			.map(([genre]) => genre)

		sheetRef.current?.close()

		if (selectedGenres.length) {
			const adjustedFilters = setProperty(
				clone(filters),
				`metadata.genres.likeAnyOf`,
				selectedGenres,
			)
			setFilters(adjustedFilters)
		} else {
			const adjustedFilters = setProperty(clone(filters), `metadata.genres`, undefined)
			setFilters(adjustedFilters)
		}
	}, [filters, setFilters, selectionState])

	const isActive =
		!!filters.metadata?.genres?.likeAnyOf && filters.metadata.genres.likeAnyOf.length > 0

	const filteredGenres = useMemo(() => {
		if (!searchQuery.trim()) return genres
		const query = searchQuery.toLowerCase()
		return genres.filter((genre) => genre.toLowerCase().includes(query))
	}, [genres, searchQuery])

	const filterListProps = useFilterListProps()

	useEffect(() => {
		// Sync local selection state with global filters (in case of external changes, e.g. clear filters)
		const newState = match(genreFilter)
			.with(P.array(P.string), (likeAnyOf) =>
				likeAnyOf.reduce(
					(acc, genre) => ({ ...acc, [genre]: true }),
					{} as Record<string, boolean>,
				),
			)
			.otherwise(() => ({}) as Record<string, boolean>)
		setSelectionState(newState)
	}, [genreFilter])

	const renderItem = useCallback(
		({ item }: { item: string }) => (
			<GenreItem item={item} checked={selectionState[item] ?? false} onSelect={onSelectGenre} />
		),
		[selectionState, onSelectGenre],
	)

	if (isPending) return null

	return (
		<FilterSheet
			ref={sheetRef}
			label="Genres"
			isActive={isActive}
			header={
				<View className="flex flex-row items-center justify-between">
					<FilterHeaderButton icon="x" onPress={() => sheetRef.current?.close()} />

					<Text size="lg" className="font-medium tracking-wide text-foreground-subtle">
						Genres
					</Text>

					<FilterHeaderButton icon="check" variant="prominent" onPress={onSubmitChanges} />
				</View>
			}
		>
			{filteredGenres.length === 0 ? (
				<Text className="py-8 text-center text-foreground-muted">
					{genres.length === 0 ? 'No genres found' : 'No matching genres'}
				</Text>
			) : (
				<FlatList
					{...filterListProps}
					data={filteredGenres}
					keyExtractor={(item) => item}
					renderItem={renderItem}
					stickyHeaderIndices={[0]}
					ListHeaderComponent={
						<FilterSheetSearchHeader
							placeholder="Search genres..."
							value={searchQuery}
							onChangeText={setSearchQuery}
						/>
					}
				/>
			)}
		</FilterSheet>
	)
}
