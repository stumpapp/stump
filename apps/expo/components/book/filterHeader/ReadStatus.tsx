import { ReadingStatus } from '@stump/graphql'
import { Fragment, useCallback, useMemo, useState } from 'react'
import { Platform, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { match, P } from 'ts-pattern'

import { FilterSheet } from '~/components/filter'
import { Checkbox, Heading, Label, Text } from '~/components/ui'
import { cn } from '~/lib/utils'
import { useBookFilterStore } from '~/stores/filters'

const STATUSES = ['READING', 'FINISHED', 'ABANDONED', 'NOT_STARTED'] as const
const LABELS: Record<(typeof STATUSES)[number], string> = {
	READING: 'Currently Reading',
	FINISHED: 'Finished Reading',
	ABANDONED: 'Abandoned',
	NOT_STARTED: 'Not Started',
}

export default function ReadStatus() {
	const insets = useSafeAreaInsets()

	const { filters, setFilters } = useBookFilterStore((store) => ({
		filters: store.filters,
		setFilters: store.setFilters,
	}))

	const statusFilter = useMemo(() => filters.readingStatus?.isAnyOf, [filters])

	const [selectionState, setSelectionState] = useState(() => {
		return match(statusFilter)
			.with(P.array(P.string), (isAnyOf) =>
				isAnyOf.reduce(
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
				setFilters({
					...filters,
					readingStatus: { isAnyOf: adjusted as ReadingStatus[] },
				})
			} else {
				setFilters({
					...filters,
					readingStatus: undefined,
				})
			}
		},
		[filters, setFilters, statusFilter],
	)

	const isActive = !!filters.readingStatus?.isAnyOf && filters.readingStatus.isAnyOf.length > 0

	return (
		<FilterSheet label="Status" isActive={isActive}>
			<View
				className="gap-8"
				style={{
					paddingBottom: Platform.OS === 'android' ? 32 : insets.bottom,
				}}
			>
				<View>
					<Heading size="xl">Read Status</Heading>
					<Text className="text-foreground-muted">Filter by read status</Text>
				</View>

				<View className="gap-3">
					<Text>Available Read Status</Text>

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
			</View>
		</FilterSheet>
	)
}

const Divider = () => <View className={cn('h-px w-full bg-edge')} />
