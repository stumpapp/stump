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

type InkerItemProps = {
	item: string
	checked: boolean
	onSelect: (inker: string, checked: boolean) => void
}

const InkerItem = memo(function InkerItem({ item, checked, onSelect }: InkerItemProps) {
	return (
		<View className="flex flex-row items-center gap-3 px-7 py-3">
			<Checkbox id={item} checked={checked} onCheckedChange={(c) => onSelect(item, !!c)} />
			<Label htmlFor={item}>{item}</Label>
		</View>
	)
})

const query = graphql(`
	query Inkers($seriesId: ID) {
		mediaMetadataOverview(seriesId: $seriesId) {
			inkers
		}
	}
`)

export default function Inkers() {
	const { seriesId } = useBookFilterHeaderContext()
	const { data, isPending } = useGraphQL(query, ['inkers', seriesId], { seriesId })

	const inkers = useMemo(
		() => data?.mediaMetadataOverview?.inkers ?? [],
		[data?.mediaMetadataOverview?.inkers],
	)

	const sheetRef = useRef<FilterSheetRef>(null)
	const [searchQuery, setSearchQuery] = useState('')

	const filters = useBookFilterStore((store) => store.filters)
	const setFilters = useBookFilterStore((store) => store.setFilters)

	const inkerFilter = useMemo(
		() => filters.metadata?.inkers?.likeAnyOf,
		[filters.metadata?.inkers?.likeAnyOf],
	)

	const [selectionState, setSelectionState] = useState(() => {
		return match(inkerFilter)
			.with(P.array(P.string), (likeAnyOf) =>
				likeAnyOf.reduce(
					(acc, inker) => ({ ...acc, [inker]: true }),
					{} as Record<string, boolean>,
				),
			)
			.otherwise(() => ({}) as Record<string, boolean>)
	})

	const onSelectInker = useCallback((inker: string, checked: boolean) => {
		setSelectionState((prev) => ({
			...prev,
			[inker]: checked,
		}))
	}, [])

	const onSubmitChanges = useCallback(() => {
		const selectedInkers = Object.entries(selectionState)
			.filter(([, isSelected]) => isSelected)
			.map(([inker]) => inker)

		sheetRef.current?.close()

		if (selectedInkers.length) {
			const adjustedFilters = setProperty(
				clone(filters),
				`metadata.inkers.likeAnyOf`,
				selectedInkers,
			)
			setFilters(adjustedFilters)
		} else {
			const adjustedFilters = setProperty(clone(filters), `metadata.inkers`, undefined)
			setFilters(adjustedFilters)
		}
	}, [filters, setFilters, selectionState])

	const isActive =
		!!filters.metadata?.inkers?.likeAnyOf && filters.metadata.inkers.likeAnyOf.length > 0

	const filteredInkers = useMemo(() => {
		if (!searchQuery.trim()) return inkers
		const query = searchQuery.toLowerCase()
		return inkers.filter((inker) => inker.toLowerCase().includes(query))
	}, [inkers, searchQuery])

	const filterListProps = useFilterListProps()

	useEffect(() => {
		const newState = match(inkerFilter)
			.with(P.array(P.string), (likeAnyOf) =>
				likeAnyOf.reduce(
					(acc, inker) => ({ ...acc, [inker]: true }),
					{} as Record<string, boolean>,
				),
			)
			.otherwise(() => ({}) as Record<string, boolean>)
		setSelectionState(newState)
	}, [inkerFilter])

	const renderItem = useCallback(
		({ item }: { item: string }) => (
			<InkerItem item={item} checked={selectionState[item] ?? false} onSelect={onSelectInker} />
		),
		[selectionState, onSelectInker],
	)

	if (isPending) return null

	return (
		<FilterSheet
			ref={sheetRef}
			label="Inkers"
			isActive={isActive}
			header={
				<View className="flex flex-row items-center justify-between">
					<FilterHeaderButton icon="x" onPress={() => sheetRef.current?.close()} />

					<Text size="lg" className="font-medium tracking-wide text-foreground-subtle">
						Inkers
					</Text>

					<FilterHeaderButton icon="check" variant="prominent" onPress={onSubmitChanges} />
				</View>
			}
		>
			{filteredInkers.length === 0 ? (
				<Text className="py-8 text-center text-foreground-muted">
					{inkers.length === 0 ? 'No inkers found' : 'No matching inkers'}
				</Text>
			) : (
				<FlatList
					{...filterListProps}
					data={filteredInkers}
					keyExtractor={(item) => item}
					renderItem={renderItem}
					stickyHeaderIndices={[0]}
					ListHeaderComponent={
						<FilterSheetSearchHeader
							placeholder="Search inkers..."
							value={searchQuery}
							onChangeText={setSearchQuery}
						/>
					}
				/>
			)}
		</FilterSheet>
	)
}
