import { useGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import setProperty from 'lodash/set'
import { Fragment, useCallback, useMemo, useState } from 'react'
import { Platform, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { match, P } from 'ts-pattern'

import { FilterSheet } from '~/components/filter'
import { Checkbox, Heading, Label, Text } from '~/components/ui'
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
	const { data, isLoading } = useGraphQL(query, ['seriesMetadata', seriesId], { seriesId })

	const seriesList = data?.mediaMetadataOverview?.series ?? []

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

	const onSelectSeries = useCallback(
		(series: string, checked: boolean) => {
			setSelectionState((prev) => ({
				...prev,
				[series]: checked,
			}))

			const adjusted = match(seriesFilter)
				.with(P.array(P.string), (likeAnyOf) =>
					checked ? [...(likeAnyOf || []), series] : likeAnyOf.filter((g) => g !== series),
				)
				.otherwise(() => (checked ? [series] : ([] as string[])))

			if (adjusted.length) {
				const adjustedFilters = setProperty(filters, `metadata.series.likeAnyOf`, adjusted)
				setFilters(adjustedFilters)
			} else {
				const adjustedFilters = setProperty(filters, `metadata.series`, undefined)
				setFilters(adjustedFilters)
			}
		},
		[filters, setFilters, seriesFilter],
	)

	const isActive =
		!!filters.metadata?.series?.likeAnyOf && filters.metadata.series.likeAnyOf.length > 0

	if (isLoading) return null

	return (
		<FilterSheet label="Series" isActive={isActive}>
			<View
				className="gap-8"
				style={{
					paddingBottom: Platform.OS === 'android' ? 32 : insets.bottom,
				}}
			>
				<View>
					<Heading size="xl">Series</Heading>
					<Text className="text-foreground-muted">Filter by series</Text>
				</View>

				<View className="gap-3">
					<Text>Available Series</Text>

					<View className="gap-0 rounded-lg border border-edge bg-background-surface">
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
