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
	query Writers($seriesId: ID) {
		mediaMetadataOverview(seriesId: $seriesId) {
			writers
		}
	}
`)

export default function Writers() {
	const insets = useSafeAreaInsets()

	const { seriesId } = useBookFilterHeaderContext()
	const { data, isLoading } = useGraphQL(query, ['writers', seriesId], { seriesId })

	const writers = data?.mediaMetadataOverview?.writers ?? []

	const { filters, setFilters } = useBookFilterStore((store) => ({
		filters: store.filters,
		setFilters: store.setFilters,
	}))

	const writerFilter = useMemo(() => filters.metadata?.writers?.likeAnyOf, [filters])

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

	const onSelectWriter = useCallback(
		(writer: string, checked: boolean) => {
			setSelectionState((prev) => ({
				...prev,
				[writer]: checked,
			}))

			const adjusted = match(writerFilter)
				.with(P.array(P.string), (likeAnyOf) =>
					checked ? [...(likeAnyOf || []), writer] : likeAnyOf.filter((g) => g !== writer),
				)
				.otherwise(() => (checked ? [writer] : ([] as string[])))

			if (adjusted.length) {
				const adjustedFilters = setProperty(filters, `metadata.writers.likeAnyOf`, adjusted)
				setFilters(adjustedFilters)
			} else {
				const adjustedFilters = setProperty(filters, `metadata.writers`, undefined)
				setFilters(adjustedFilters)
			}
		},
		[filters, setFilters, writerFilter],
	)

	const isActive =
		!!filters.metadata?.writers?.likeAnyOf && filters.metadata.writers.likeAnyOf.length > 0

	if (isLoading) return null

	return (
		<FilterSheet label="Writers" isActive={isActive}>
			<View
				className="gap-8"
				style={{
					paddingBottom: Platform.OS === 'android' ? 32 : insets.bottom,
				}}
			>
				<View>
					<Heading size="xl">Writers</Heading>
					<Text className="text-foreground-muted">Filter by writers</Text>
				</View>

				<View className="gap-3">
					<Text>Available Writers</Text>

					<View className="gap-0 rounded-lg border border-edge bg-background-surface">
						{writers.map((writer, idx) => (
							<Fragment key={writer}>
								<View className="flex flex-row items-center gap-3 p-3">
									<Checkbox
										checked={selectionState[writer]}
										onCheckedChange={(checked) => onSelectWriter(writer, checked)}
									/>
									<Label htmlFor={writer}>{writer}</Label>
								</View>

								{idx < writers.length - 1 && <Divider />}
							</Fragment>
						))}

						{!writers.length && (
							<View className="p-3">
								<Text className="text-foreground-muted">No writers found</Text>
							</View>
						)}
					</View>
				</View>
			</View>
		</FilterSheet>
	)
}

const Divider = () => <View className={cn('h-px w-full bg-edge')} />
