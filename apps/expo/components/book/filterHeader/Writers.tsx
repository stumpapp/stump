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
	query Writers($seriesId: ID) {
		mediaMetadataOverview(seriesId: $seriesId) {
			writers
		}
	}
`)

export default function Writers() {
	const insets = useSafeAreaInsets()

	const { seriesId } = useBookFilterHeaderContext()
	const { data, isPending } = useGraphQL(query, ['writers', seriesId], { seriesId })

	const writers = data?.mediaMetadataOverview?.writers ?? []

	const sheetRef = useRef<FilterSheetRef>(null)

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
			<View
				className="gap-8"
				style={{
					paddingBottom: Platform.OS === 'android' ? 32 : insets.bottom,
				}}
			>
				<View className="gap-3">
					<Text>Available Writers</Text>

					<View className="squircle gap-0 rounded-lg border border-edge bg-background-surface">
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
