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
	query Genres($seriesId: ID) {
		mediaMetadataOverview(seriesId: $seriesId) {
			genres
		}
	}
`)

export default function Genres() {
	const insets = useSafeAreaInsets()

	const { seriesId } = useBookFilterHeaderContext()
	const { data, isPending } = useGraphQL(query, ['genres', seriesId], { seriesId })

	const genres = data?.mediaMetadataOverview?.genres ?? []

	const sheetRef = useRef<FilterSheetRef>(null)

	const { filters, setFilters } = useBookFilterStore((store) => ({
		filters: store.filters,
		setFilters: store.setFilters,
	}))

	const genreFilter = useMemo(() => filters.metadata?.genres?.likeAnyOf, [filters])

	const [selectionState, setSelectionState] = useState(() => {
		return match(genreFilter)
			.with(P.array(P.string), (likeAnyOf) =>
				likeAnyOf.reduce(
					(acc, genre) => ({ ...acc, [genre]: true }),
					{} as Record<string, boolean>,
				),
			)
			.otherwise(() => ({}) as Record<string, boolean>)
	})

	const onSelectGenre = useCallback((genre: string, checked: boolean) => {
		setSelectionState((prev) => ({
			...prev,
			[genre]: checked,
		}))
	}, [])

	const onSubmitChanges = useCallback(() => {
		const selectedGenres = Object.entries(selectionState)
			.filter(([, isSelected]) => isSelected)
			.map(([genre]) => genre)

		sheetRef.current?.close()

		if (selectedGenres.length) {
			const adjustedFilters = setProperty(
				clone(filters),
				`metadata.genres.likeAnyOf`,
				selectedGenres,
			)
			setFilters(adjustedFilters)
		} else {
			const adjustedFilters = setProperty(clone(filters), `metadata.genres`, undefined)
			setFilters(adjustedFilters)
		}
	}, [filters, setFilters, selectionState])

	const isActive =
		!!filters.metadata?.genres?.likeAnyOf && filters.metadata.genres.likeAnyOf.length > 0

	useEffect(() => {
		// Sync local selection state with global filters (in case of external changes, e.g. clear filters)
		const newState = match(genreFilter)
			.with(P.array(P.string), (likeAnyOf) =>
				likeAnyOf.reduce(
					(acc, genre) => ({ ...acc, [genre]: true }),
					{} as Record<string, boolean>,
				),
			)
			.otherwise(() => ({}) as Record<string, boolean>)
		setSelectionState(newState)
	}, [genreFilter])

	if (isPending) return null

	return (
		<FilterSheet
			ref={sheetRef}
			label="Genres"
			isActive={isActive}
			header={
				<View className="flex flex-row items-center justify-between">
					<FilterHeaderButton icon="x" onPress={() => sheetRef.current?.close()} />

					<Text size="lg" className="font-medium tracking-wide text-foreground-subtle">
						Genres
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
					<Text>Available Genres</Text>

					<View className="squircle gap-0 rounded-lg border border-edge bg-background-surface">
						{genres.map((genre, idx) => (
							<Fragment key={genre}>
								<View className="flex flex-row items-center gap-3 p-3">
									<Checkbox
										checked={selectionState[genre]}
										onCheckedChange={(checked) => onSelectGenre(genre, checked)}
									/>
									<Label htmlFor={genre}>{genre}</Label>
								</View>

								{idx < genres.length - 1 && <Divider />}
							</Fragment>
						))}

						{!genres.length && (
							<View className="p-3">
								<Text className="text-foreground-muted">No genres found</Text>
							</View>
						)}
					</View>
				</View>
			</View>
		</FilterSheet>
	)
}

const Divider = () => <View className={cn('h-px w-full bg-edge')} />
