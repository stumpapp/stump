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

type WriterItemProps = {
	item: string
	checked: boolean
	onSelect: (writer: string, checked: boolean) => void
}

const WriterItem = memo(function WriterItem({ item, checked, onSelect }: WriterItemProps) {
	return (
		<View className="flex flex-row items-center gap-3 px-7 py-3">
			<Checkbox id={item} checked={checked} onCheckedChange={(c) => onSelect(item, !!c)} />
			<Label htmlFor={item}>{item}</Label>
		</View>
	)
})

const query = graphql(`
	query Writers($seriesId: ID) {
		mediaMetadataOverview(seriesId: $seriesId) {
			writers
		}
	}
`)

export default function Writers() {
	const { seriesId } = useBookFilterHeaderContext()
	const { data, isPending } = useGraphQL(query, ['writers', seriesId], { seriesId })

	const writers = useMemo(
		() => data?.mediaMetadataOverview?.writers ?? [],
		[data?.mediaMetadataOverview?.writers],
	)

	const sheetRef = useRef<FilterSheetRef>(null)
	const [searchQuery, setSearchQuery] = useState('')

	const filters = useBookFilterStore((store) => store.filters)
	const setFilters = useBookFilterStore((store) => store.setFilters)

	const writerFilter = useMemo(
		() => filters.metadata?.writers?.likeAnyOf,
		[filters.metadata?.writers?.likeAnyOf],
	)

	const [selectionState, setSelectionState] = useState(() => {
		return match(writerFilter)
			.with(P.array(P.string), (likeAnyOf) =>
				likeAnyOf.reduce(
					(acc, writer) => ({ ...acc, [writer]: true }),
					{} as Record<string, boolean>,
				),
			)
			.otherwise(() => ({}) as Record<string, boolean>)
	})

	const onSelectWriter = useCallback((writer: string, checked: boolean) => {
		setSelectionState((prev) => ({
			...prev,
			[writer]: checked,
		}))
	}, [])

	const onSubmitChanges = useCallback(() => {
		const selectedWriters = Object.entries(selectionState)
			.filter(([, isSelected]) => isSelected)
			.map(([writer]) => writer)

		sheetRef.current?.close()

		if (selectedWriters.length) {
			const adjustedFilters = setProperty(
				clone(filters),
				`metadata.writers.likeAnyOf`,
				selectedWriters,
			)
			setFilters(adjustedFilters)
		} else {
			const adjustedFilters = setProperty(clone(filters), `metadata.writers`, undefined)
			setFilters(adjustedFilters)
		}
	}, [filters, setFilters, selectionState])

	const isActive =
		!!filters.metadata?.writers?.likeAnyOf && filters.metadata.writers.likeAnyOf.length > 0

	const filteredWriters = useMemo(() => {
		if (!searchQuery.trim()) return writers
		const query = searchQuery.toLowerCase()
		return writers.filter((writer) => writer.toLowerCase().includes(query))
	}, [writers, searchQuery])

	const filterListProps = useFilterListProps()

	useEffect(() => {
		// Sync local selection state with global filters (in case of external changes, e.g. clear filters)
		const newState = match(writerFilter)
			.with(P.array(P.string), (likeAnyOf) =>
				likeAnyOf.reduce(
					(acc, writer) => ({ ...acc, [writer]: true }),
					{} as Record<string, boolean>,
				),
			)
			.otherwise(() => ({}) as Record<string, boolean>)
		setSelectionState(newState)
	}, [writerFilter])

	const renderItem = useCallback(
		({ item }: { item: string }) => (
			<WriterItem item={item} checked={selectionState[item] ?? false} onSelect={onSelectWriter} />
		),
		[selectionState, onSelectWriter],
	)

	if (isPending) return null

	return (
		<FilterSheet
			ref={sheetRef}
			label="Writers"
			isActive={isActive}
			header={
				<View className="flex flex-row items-center justify-between">
					<FilterHeaderButton icon="x" onPress={() => sheetRef.current?.close()} />

					<Text size="lg" className="font-medium tracking-wide text-foreground-subtle">
						Writers
					</Text>

					<FilterHeaderButton icon="check" variant="prominent" onPress={onSubmitChanges} />
				</View>
			}
		>
			{filteredWriters.length === 0 ? (
				<Text className="py-8 text-center text-foreground-muted">
					{writers.length === 0 ? 'No writers found' : 'No matching writers'}
				</Text>
			) : (
				<FlatList
					{...filterListProps}
					data={filteredWriters}
					keyExtractor={(item) => item}
					renderItem={renderItem}
					stickyHeaderIndices={[0]}
					ListHeaderComponent={
						<FilterSheetSearchHeader
							placeholder="Search writers..."
							value={searchQuery}
							onChangeText={setSearchQuery}
						/>
					}
				/>
			)}
		</FilterSheet>
	)
}
