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

type ColoristItemProps = {
	item: string
	checked: boolean
	onSelect: (colorist: string, checked: boolean) => void
}

const ColoristItem = memo(function ColoristItem({ item, checked, onSelect }: ColoristItemProps) {
	return (
		<View className="flex flex-row items-center gap-3 px-7 py-3">
			<Checkbox id={item} checked={checked} onCheckedChange={(c) => onSelect(item, !!c)} />
			<Label htmlFor={item}>{item}</Label>
		</View>
	)
})

const query = graphql(`
	query Colorists($seriesId: ID) {
		mediaMetadataOverview(seriesId: $seriesId) {
			colorists
		}
	}
`)

export default function Colorists() {
	const { seriesId } = useBookFilterHeaderContext()
	const { data, isPending } = useGraphQL(query, ['colorists', seriesId], { seriesId })

	const colorists = useMemo(
		() => data?.mediaMetadataOverview?.colorists ?? [],
		[data?.mediaMetadataOverview?.colorists],
	)

	const sheetRef = useRef<FilterSheetRef>(null)
	const [searchQuery, setSearchQuery] = useState('')

	const filters = useBookFilterStore((store) => store.filters)
	const setFilters = useBookFilterStore((store) => store.setFilters)

	const coloristFilter = useMemo(
		() => filters.metadata?.colorists?.likeAnyOf,
		[filters.metadata?.colorists?.likeAnyOf],
	)

	const [selectionState, setSelectionState] = useState(() => {
		return match(coloristFilter)
			.with(P.array(P.string), (likeAnyOf) =>
				likeAnyOf.reduce(
					(acc, colorist) => ({ ...acc, [colorist]: true }),
					{} as Record<string, boolean>,
				),
			)
			.otherwise(() => ({}) as Record<string, boolean>)
	})

	const onSelectColorist = useCallback((colorist: string, checked: boolean) => {
		setSelectionState((prev) => ({
			...prev,
			[colorist]: checked,
		}))
	}, [])

	const onSubmitChanges = useCallback(() => {
		const selectedColorists = Object.entries(selectionState)
			.filter(([, isSelected]) => isSelected)
			.map(([colorist]) => colorist)

		sheetRef.current?.close()

		if (selectedColorists.length) {
			const adjustedFilters = setProperty(
				clone(filters),
				`metadata.colorists.likeAnyOf`,
				selectedColorists,
			)
			setFilters(adjustedFilters)
		} else {
			const adjustedFilters = setProperty(clone(filters), `metadata.colorists`, undefined)
			setFilters(adjustedFilters)
		}
	}, [filters, setFilters, selectionState])

	const isActive =
		!!filters.metadata?.colorists?.likeAnyOf && filters.metadata.colorists.likeAnyOf.length > 0

	const filteredColorists = useMemo(() => {
		if (!searchQuery.trim()) return colorists
		const query = searchQuery.toLowerCase()
		return colorists.filter((colorist) => colorist.toLowerCase().includes(query))
	}, [colorists, searchQuery])

	const filterListProps = useFilterListProps()

	useEffect(() => {
		const newState = match(coloristFilter)
			.with(P.array(P.string), (likeAnyOf) =>
				likeAnyOf.reduce(
					(acc, colorist) => ({ ...acc, [colorist]: true }),
					{} as Record<string, boolean>,
				),
			)
			.otherwise(() => ({}) as Record<string, boolean>)
		setSelectionState(newState)
	}, [coloristFilter])

	const renderItem = useCallback(
		({ item }: { item: string }) => (
			<ColoristItem
				item={item}
				checked={selectionState[item] ?? false}
				onSelect={onSelectColorist}
			/>
		),
		[selectionState, onSelectColorist],
	)

	if (isPending) return null

	return (
		<FilterSheet
			ref={sheetRef}
			label="Colorists"
			isActive={isActive}
			header={
				<View className="flex flex-row items-center justify-between">
					<FilterHeaderButton icon="x" onPress={() => sheetRef.current?.close()} />

					<Text size="lg" className="font-medium tracking-wide text-foreground-subtle">
						Colorists
					</Text>

					<FilterHeaderButton icon="check" variant="prominent" onPress={onSubmitChanges} />
				</View>
			}
		>
			{filteredColorists.length === 0 ? (
				<Text className="py-8 text-center text-foreground-muted">
					{colorists.length === 0 ? 'No colorists found' : 'No matching colorists'}
				</Text>
			) : (
				<FlatList
					{...filterListProps}
					data={filteredColorists}
					keyExtractor={(item) => item}
					renderItem={renderItem}
					stickyHeaderIndices={[0]}
					ListHeaderComponent={
						<FilterSheetSearchHeader
							placeholder="Search colorists..."
							value={searchQuery}
							onChangeText={setSearchQuery}
						/>
					}
				/>
			)}
		</FilterSheet>
	)
}
