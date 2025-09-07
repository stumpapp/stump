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
	query Genres($seriesId: ID) {
		mediaMetadataOverview(seriesId: $seriesId) {
			genres
		}
	}
`)

export default function Genres() {
	const insets = useSafeAreaInsets()

	const { seriesId } = useBookFilterHeaderContext()
	const {
		// data: {
		// 	mediaMetadataOverview: { genres },
		// },
		data,
		isLoading,
	} = useGraphQL(query, ['genres', seriesId], { seriesId })

	const genres = data?.mediaMetadataOverview?.genres ?? []

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

	const onSelectGenre = useCallback(
		(genre: string, checked: boolean) => {
			setSelectionState((prev) => ({
				...prev,
				[genre]: checked,
			}))

			const adjusted = match(genreFilter)
				.with(P.array(P.string), (likeAnyOf) =>
					checked ? [...(likeAnyOf || []), genre] : likeAnyOf.filter((g) => g !== genre),
				)
				.otherwise(() => (checked ? [genre] : ([] as string[])))

			if (adjusted.length) {
				const adjustedFilters = setProperty(filters, `metadata.genres.likeAnyOf`, adjusted)
				setFilters(adjustedFilters)
			} else {
				const adjustedFilters = setProperty(filters, `metadata.genres`, undefined)
				setFilters(adjustedFilters)
			}
		},
		[filters, setFilters, genreFilter],
	)

	const isActive =
		!!filters.metadata?.genres?.likeAnyOf && filters.metadata.genres.likeAnyOf.length > 0

	if (isLoading) return null

	return (
		<FilterSheet label="Genres" isActive={isActive}>
			<View
				className="gap-8"
				style={{
					paddingBottom: Platform.OS === 'android' ? 32 : insets.bottom,
				}}
			>
				<View>
					<Heading size="xl">Genres</Heading>
					<Text className="text-foreground-muted">Filter by genres</Text>
				</View>

				<View className="gap-3">
					<Text>Available Genres</Text>

					<View className="gap-0 rounded-lg border border-edge bg-background-surface">
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
