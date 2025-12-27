import clone from 'lodash/cloneDeep'
import setProperty from 'lodash/set'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { match, P } from 'ts-pattern'

import { FilterHeaderButton, FilterSheet } from '~/components/filter'
import { FilterSheetRef } from '~/components/filter/FilterSheet'
import { Checkbox, Label, Text } from '~/components/ui'
import { useSeriesFilterStore } from '~/stores/filters'

export const STATUSES = ['Abandoned', 'Ongoing', 'Completed', 'Cancelled', 'Hiatus'] as const
const LABELS: Record<(typeof STATUSES)[number], string> = {
	Abandoned: 'Abandoned',
	Ongoing: 'Ongoing',
	Completed: 'Completed',
	Cancelled: 'Cancelled',
	Hiatus: 'Hiatus',
}

export default function Status() {
	const insets = useSafeAreaInsets()

	const sheetRef = useRef<FilterSheetRef>(null)

	const filters = useSeriesFilterStore((store) => store.filters)
	const setFilters = useSeriesFilterStore((store) => store.setFilters)

	const statusFilter = useMemo(
		() => filters.metadata?.status?.likeAnyOf,
		[filters.metadata?.status?.likeAnyOf],
	)

	const [selectionState, setSelectionState] = useState(() => {
		return match(statusFilter)
			.with(P.array(P.string), (likeAnyOf) =>
				likeAnyOf.reduce(
					(acc, status) => ({ ...acc, [status]: true }),
					{} as Record<string, boolean>,
				),
			)
			.otherwise(() => ({}) as Record<string, boolean>)
	})

	const onSelectStatus = useCallback((status: string, checked: boolean) => {
		setSelectionState((prev) => ({
			...prev,
			[status]: checked,
		}))
	}, [])

	const onSubmitChanges = useCallback(() => {
		const selectedStatuses = Object.entries(selectionState)
			.filter(([, isSelected]) => isSelected)
			.map(([status]) => status)

		sheetRef.current?.close()

		if (selectedStatuses.length) {
			const adjustedFilters = setProperty(
				clone(filters),
				`metadata.status.likeAnyOf`,
				selectedStatuses,
			)
			setFilters(adjustedFilters)
		} else {
			const adjustedFilters = setProperty(clone(filters), `metadata.status`, undefined)
			setFilters(adjustedFilters)
		}
	}, [filters, setFilters, selectionState])

	const isActive =
		!!filters.metadata?.status?.likeAnyOf && filters.metadata.status.likeAnyOf.length > 0

	useEffect(() => {
		// Sync local selection state with global filters (in case of external changes, e.g. clear filters)
		const newState = match(statusFilter)
			.with(P.array(P.string), (likeAnyOf) =>
				likeAnyOf.reduce(
					(acc, status) => ({ ...acc, [status]: true }),
					{} as Record<string, boolean>,
				),
			)
			.otherwise(() => ({}) as Record<string, boolean>)
		setSelectionState(newState)
	}, [statusFilter])

	return (
		<FilterSheet
			ref={sheetRef}
			label="Status"
			isActive={isActive}
			header={
				<View className="flex flex-row items-center justify-between">
					<FilterHeaderButton icon="x" onPress={() => sheetRef.current?.close()} />

					<Text size="lg" className="font-medium tracking-wide text-foreground-subtle">
						Status
					</Text>

					<FilterHeaderButton icon="check" variant="prominent" onPress={onSubmitChanges} />
				</View>
			}
		>
			<View
				className="pt-2"
				style={{
					paddingBottom: insets.bottom + 24,
				}}
			>
				{STATUSES.map((status, idx) => (
					<Fragment key={status}>
						<View className="flex flex-row items-center gap-3 px-7 py-3">
							<Checkbox
								id={status}
								checked={selectionState[status]}
								onCheckedChange={(checked) => onSelectStatus(status, !!checked)}
							/>
							<Label htmlFor={status}>{LABELS[status]}</Label>
						</View>

						{idx < STATUSES.length - 1 && <View className="h-px bg-edge" />}
					</Fragment>
				))}
			</View>
		</FilterSheet>
	)
}
