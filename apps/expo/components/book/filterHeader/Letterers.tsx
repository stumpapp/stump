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

type LettererItemProps = {
	item: string
	checked: boolean
	onSelect: (letterer: string, checked: boolean) => void
}

const LettererItem = memo(function LettererItem({ item, checked, onSelect }: LettererItemProps) {
	return (
		<View className="flex flex-row items-center gap-3 px-7 py-3">
			<Checkbox id={item} checked={checked} onCheckedChange={(c) => onSelect(item, !!c)} />
			<Label htmlFor={item}>{item}</Label>
		</View>
	)
})

const query = graphql(`
	query Letterers($seriesId: ID) {
		mediaMetadataOverview(seriesId: $seriesId) {
			letterers
		}
	}
`)

export default function Letterers() {
	const { seriesId } = useBookFilterHeaderContext()
	const { data, isPending } = useGraphQL(query, ['letterers', seriesId], { seriesId })

	const letterers = useMemo(
		() => data?.mediaMetadataOverview?.letterers ?? [],
		[data?.mediaMetadataOverview?.letterers],
	)

	const sheetRef = useRef<FilterSheetRef>(null)
	const [searchQuery, setSearchQuery] = useState('')

	const filters = useBookFilterStore((store) => store.filters)
	const setFilters = useBookFilterStore((store) => store.setFilters)

	const lettererFilter = useMemo(
		() => filters.metadata?.letterers?.likeAnyOf,
		[filters.metadata?.letterers?.likeAnyOf],
	)

	const [selectionState, setSelectionState] = useState(() => {
		return match(lettererFilter)
			.with(P.array(P.string), (likeAnyOf) =>
				likeAnyOf.reduce(
					(acc, letterer) => ({ ...acc, [letterer]: true }),
					{} as Record<string, boolean>,
				),
			)
			.otherwise(() => ({}) as Record<string, boolean>)
	})

	const onSelectLetterer = useCallback((letterer: string, checked: boolean) => {
		setSelectionState((prev) => ({
			...prev,
			[letterer]: checked,
		}))
	}, [])

	const onSubmitChanges = useCallback(() => {
		const selectedLetterers = Object.entries(selectionState)
			.filter(([, isSelected]) => isSelected)
			.map(([letterer]) => letterer)

		sheetRef.current?.close()

		if (selectedLetterers.length) {
			const adjustedFilters = setProperty(
				clone(filters),
				`metadata.letterers.likeAnyOf`,
				selectedLetterers,
			)
			setFilters(adjustedFilters)
		} else {
			const adjustedFilters = setProperty(clone(filters), `metadata.letterers`, undefined)
			setFilters(adjustedFilters)
		}
	}, [filters, setFilters, selectionState])

	const isActive =
		!!filters.metadata?.letterers?.likeAnyOf && filters.metadata.letterers.likeAnyOf.length > 0

	const filteredLetterers = useMemo(() => {
		if (!searchQuery.trim()) return letterers
		const query = searchQuery.toLowerCase()
		return letterers.filter((letterer) => letterer.toLowerCase().includes(query))
	}, [letterers, searchQuery])

	const filterListProps = useFilterListProps()

	useEffect(() => {
		const newState = match(lettererFilter)
			.with(P.array(P.string), (likeAnyOf) =>
				likeAnyOf.reduce(
					(acc, letterer) => ({ ...acc, [letterer]: true }),
					{} as Record<string, boolean>,
				),
			)
			.otherwise(() => ({}) as Record<string, boolean>)
		setSelectionState(newState)
	}, [lettererFilter])

	const renderItem = useCallback(
		({ item }: { item: string }) => (
			<LettererItem
				item={item}
				checked={selectionState[item] ?? false}
				onSelect={onSelectLetterer}
			/>
		),
		[selectionState, onSelectLetterer],
	)

	if (isPending) return null

	return (
		<FilterSheet
			ref={sheetRef}
			label="Letterers"
			isActive={isActive}
			header={
				<View className="flex flex-row items-center justify-between">
					<FilterHeaderButton icon="x" onPress={() => sheetRef.current?.close()} />

					<Text size="lg" className="font-medium tracking-wide text-foreground-subtle">
						Letterers
					</Text>

					<FilterHeaderButton icon="check" variant="prominent" onPress={onSubmitChanges} />
				</View>
			}
		>
			{filteredLetterers.length === 0 ? (
				<Text className="py-8 text-center text-foreground-muted">
					{letterers.length === 0 ? 'No letterers found' : 'No matching letterers'}
				</Text>
			) : (
				<FlatList
					{...filterListProps}
					data={filteredLetterers}
					keyExtractor={(item) => item}
					renderItem={renderItem}
					stickyHeaderIndices={[0]}
					ListHeaderComponent={
						<FilterSheetSearchHeader
							placeholder="Search letterers..."
							value={searchQuery}
							onChangeText={setSearchQuery}
						/>
					}
				/>
			)}
		</FilterSheet>
	)
}
