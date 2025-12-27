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

type CharacterItemProps = {
	item: string
	checked: boolean
	onSelect: (character: string, checked: boolean) => void
}

const CharacterItem = memo(function CharacterItem({ item, checked, onSelect }: CharacterItemProps) {
	return (
		<View className="flex flex-row items-center gap-3 px-7 py-3">
			<Checkbox id={item} checked={checked} onCheckedChange={(c) => onSelect(item, !!c)} />
			<Label htmlFor={item}>{item}</Label>
		</View>
	)
})

const query = graphql(`
	query Characters($seriesId: ID) {
		mediaMetadataOverview(seriesId: $seriesId) {
			characters
		}
	}
`)

export default function Characters() {
	const { seriesId } = useBookFilterHeaderContext()
	const { data, isPending } = useGraphQL(query, ['characters', seriesId], { seriesId })

	const characters = useMemo(
		() => data?.mediaMetadataOverview?.characters ?? [],
		[data?.mediaMetadataOverview?.characters],
	)

	const sheetRef = useRef<FilterSheetRef>(null)
	const [searchQuery, setSearchQuery] = useState('')

	const { filters, setFilters } = useBookFilterStore((store) => ({
		filters: store.filters,
		setFilters: store.setFilters,
	}))

	const characterFilter = useMemo(
		() => filters.metadata?.characters?.likeAnyOf,
		[filters.metadata?.characters?.likeAnyOf],
	)

	const [selectionState, setSelectionState] = useState(() => {
		return match(characterFilter)
			.with(P.array(P.string), (likeAnyOf) =>
				likeAnyOf.reduce(
					(acc, character) => ({ ...acc, [character]: true }),
					{} as Record<string, boolean>,
				),
			)
			.otherwise(() => ({}) as Record<string, boolean>)
	})

	const onSelectCharacter = useCallback((character: string, checked: boolean) => {
		setSelectionState((prev) => ({
			...prev,
			[character]: checked,
		}))
	}, [])

	const onSubmitChanges = useCallback(() => {
		const selectedCharacters = Object.entries(selectionState)
			.filter(([, isSelected]) => isSelected)
			.map(([character]) => character)

		sheetRef.current?.close()

		if (selectedCharacters.length) {
			const adjustedFilters = setProperty(
				clone(filters),
				`metadata.characters.likeAnyOf`,
				selectedCharacters,
			)
			setFilters(adjustedFilters)
		} else {
			const adjustedFilters = setProperty(clone(filters), `metadata.characters`, undefined)
			setFilters(adjustedFilters)
		}
	}, [filters, setFilters, selectionState])

	const isActive =
		!!filters.metadata?.characters?.likeAnyOf && filters.metadata.characters.likeAnyOf.length > 0

	const filteredCharacters = useMemo(() => {
		if (!searchQuery.trim()) return characters
		const query = searchQuery.toLowerCase()
		return characters.filter((character) => character.toLowerCase().includes(query))
	}, [characters, searchQuery])

	const filterListProps = useFilterListProps()

	useEffect(() => {
		// Sync local selection state with global filters (in case of external changes, e.g. clear filters)
		const newState = match(characterFilter)
			.with(P.array(P.string), (likeAnyOf) =>
				likeAnyOf.reduce(
					(acc, character) => ({ ...acc, [character]: true }),
					{} as Record<string, boolean>,
				),
			)
			.otherwise(() => ({}) as Record<string, boolean>)
		setSelectionState(newState)
	}, [characterFilter])

	const renderItem = useCallback(
		({ item }: { item: string }) => (
			<CharacterItem
				item={item}
				checked={selectionState[item] ?? false}
				onSelect={onSelectCharacter}
			/>
		),
		[selectionState, onSelectCharacter],
	)

	if (isPending) return null

	return (
		<FilterSheet
			ref={sheetRef}
			label="Characters"
			isActive={isActive}
			header={
				<View className="flex flex-row items-center justify-between">
					<FilterHeaderButton icon="x" onPress={() => sheetRef.current?.close()} />

					<Text size="lg" className="font-medium tracking-wide text-foreground-subtle">
						Characters
					</Text>

					<FilterHeaderButton icon="check" variant="prominent" onPress={onSubmitChanges} />
				</View>
			}
		>
			{filteredCharacters.length === 0 ? (
				<Text className="py-8 text-center text-foreground-muted">
					{characters.length === 0 ? 'No characters found' : 'No matching characters'}
				</Text>
			) : (
				<FlatList
					{...filterListProps}
					data={filteredCharacters}
					keyExtractor={(item) => item}
					renderItem={renderItem}
					stickyHeaderIndices={[0]}
					ListHeaderComponent={
						<FilterSheetSearchHeader
							placeholder="Search characters..."
							value={searchQuery}
							onChangeText={setSearchQuery}
						/>
					}
				/>
			)}
		</FilterSheet>
	)
}
