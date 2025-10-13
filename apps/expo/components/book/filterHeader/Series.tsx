import { useGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import clone from 'lodash/cloneDeep'
import setProperty from 'lodash/set'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Platform, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { match, P } from 'ts-pattern'

import { FilterHeaderButton, FilterSheet } from '~/components/filter'
import { FilterSheetRef } from '~/components/filter/FilterSheet'
import { Checkbox, Label, Text } from '~/components/ui'
import { cn } from '~/lib/utils'
import { useBookFilterStore } from '~/stores/filters'

import { useBookFilterHeaderContext } from './context'

const query = graphql(`
	query SeriesMetadata($seriesId: ID) {
		mediaMetadataOverview(seriesId: $seriesId) {
			series
		}
	}
`)

export default function Series() {
	const insets = useSafeAreaInsets()

	const { seriesId } = useBookFilterHeaderContext()
	const { data, isPending } = useGraphQL(query, ['seriesMetadata', seriesId], { seriesId })

	const seriesList = data?.mediaMetadataOverview?.series ?? []

	const sheetRef = useRef<FilterSheetRef>(null)

	const { filters, setFilters } = useBookFilterStore((store) => ({
		filters: store.filters,
		setFilters: store.setFilters,
	}))

	const seriesFilter = useMemo(() => filters.metadata?.series?.likeAnyOf, [filters])

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
			<View
				className="gap-8"
				style={{
					paddingBottom: Platform.OS === 'android' ? 32 : insets.bottom,
				}}
			>
				<View className="gap-3">
					<Text>Available Series</Text>

					<View className="squircle gap-0 rounded-lg border border-edge bg-background-surface">
						{seriesList.map((series, idx) => {
							const isLast = idx === seriesList.length - 1
							return (
								<Fragment key={series}>
									<View className="flex flex-row items-center gap-3 p-3">
										<Checkbox
											checked={selectionState[series]}
											onCheckedChange={(checked) => onSelectSeries(series, checked)}
										/>
										<Label htmlFor={series}>{series}</Label>
									</View>

									{!isLast && <Divider />}
								</Fragment>
							)
						})}

						{!seriesList.length && (
							<View className="p-3">
								<Text className="text-foreground-muted">No series found</Text>
							</View>
						)}
					</View>
				</View>
			</View>
		</FilterSheet>
	)
}

const Divider = () => <View className={cn('h-px w-full bg-edge')} />
