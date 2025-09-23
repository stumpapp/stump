import setProperty from 'lodash/set'
import { Fragment, useCallback, useMemo, useState } from 'react'
import { Platform, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { match, P } from 'ts-pattern'

import { FilterSheet } from '~/components/filter'
import { Checkbox, Heading, Label, Text } from '~/components/ui'
import { cn } from '~/lib/utils'
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

	const { filters, setFilters } = useSeriesFilterStore((store) => ({
		filters: store.filters,
		setFilters: store.setFilters,
	}))

	const statusFilter = useMemo(() => filters.metadata?.status?.likeAnyOf, [filters])

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

	const onSelectStatus = useCallback(
		(status: string, checked: boolean) => {
			setSelectionState((prev) => ({
				...prev,
				[status]: checked,
			}))

			const adjusted = match(statusFilter)
				.with(P.array(P.string), (isAnyOf) =>
					checked ? [...(isAnyOf || []), status] : isAnyOf.filter((g) => g !== status),
				)
				.otherwise(() => (checked ? [status] : ([] as string[])))

			if (adjusted.length) {
				const adjustedFilters = setProperty(filters, `metadata.status.likeAnyOf`, adjusted)
				setFilters(adjustedFilters)
			} else {
				const adjustedFilters = setProperty(filters, `metadata.status`, undefined)
				setFilters(adjustedFilters)
			}
		},
		[filters, setFilters, statusFilter],
	)

	const isActive =
		!!filters.metadata?.status?.likeAnyOf && filters.metadata.status.likeAnyOf.length > 0

	return (
		<FilterSheet label="Status" isActive={isActive}>
			<View
				className="gap-8"
				style={{
					paddingBottom: Platform.OS === 'android' ? 32 : insets.bottom,
				}}
			>
				<View>
					<Heading size="xl">Status</Heading>
					<Text className="text-foreground-muted">Filter by status</Text>
				</View>

				<View className="squircle gap-0 rounded-lg border border-edge bg-background-surface">
					{STATUSES.map((status, idx) => (
						<Fragment key={status}>
							<View className="flex flex-row items-center gap-3 p-3">
								<Checkbox
									checked={selectionState[status]}
									onCheckedChange={(checked) => onSelectStatus(status, checked)}
								/>
								<Label htmlFor={status}>{LABELS[status]}</Label>
							</View>

							{idx < STATUSES.length - 1 && <Divider />}
						</Fragment>
					))}
				</View>
			</View>
		</FilterSheet>
	)
}

const Divider = () => <View className={cn('h-px w-full bg-edge')} />
