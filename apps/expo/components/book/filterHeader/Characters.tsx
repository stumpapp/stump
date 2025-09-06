import { useSuspenseGraphQL } from '@stump/client'
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
	query Characters($seriesId: ID) {
		mediaMetadataOverview(seriesId: $seriesId) {
			characters
		}
	}
`)

export default function Characters() {
	const insets = useSafeAreaInsets()
	const { seriesId } = useBookFilterHeaderContext()
	const {
		data: {
			mediaMetadataOverview: { characters },
		},
	} = useSuspenseGraphQL(query, ['characters', seriesId], { seriesId })

	const { filters, setFilters } = useBookFilterStore((store) => ({
		filters: store.filters,
		setFilters: store.setFilters,
	}))

	const characterFilter = useMemo(() => filters.metadata?.characters?.likeAnyOf, [filters])

	const [selectionState, setSelectionState] = useState(() => {
		return match(characterFilter)
			.with(P.array(P.string), (likeAnyOf) =>
				likeAnyOf.reduce(
					(acc, character) => ({ ...acc, [character]: true }),
					{} as Record<string, boolean>,
				),
			)
			.otherwise(() => ({}) as Record<string, boolean>)
	})

	const onSelectCharacter = useCallback(
		(character: string, checked: boolean) => {
			setSelectionState((prev) => ({
				...prev,
				[character]: checked,
			}))

			const adjusted = match(characterFilter)
				.with(P.array(P.string), (likeAnyOf) =>
					checked ? [...(likeAnyOf || []), character] : likeAnyOf.filter((g) => g !== character),
				)
				.otherwise(() => (checked ? [character] : ([] as string[])))

			if (adjusted.length) {
				const adjustedFilters = setProperty(filters, `metadata.characters.likeAnyOf`, adjusted)
				setFilters(adjustedFilters)
			} else {
				const adjustedFilters = setProperty(filters, `metadata.characters`, undefined)
				setFilters(adjustedFilters)
			}
		},
		[filters, setFilters, characterFilter],
	)

	const isActive =
		!!filters.metadata?.characters?.likeAnyOf && filters.metadata.characters.likeAnyOf.length > 0

	return (
		<FilterSheet label="Characters" isActive={isActive}>
			<View
				className="gap-8"
				style={{
					paddingBottom: Platform.OS === 'android' ? 32 : insets.bottom,
				}}
			>
				<View>
					<Heading size="xl">Characters</Heading>
					<Text className="text-foreground-muted">Filter by characters</Text>
				</View>

				<View className="gap-3">
					<Text>Available Characters</Text>

					<View className="gap-0 rounded-lg border border-edge bg-background-surface">
						{characters.map((character, idx) => (
							<Fragment key={character}>
								<View className="flex flex-row items-center gap-3 p-3">
									<Checkbox
										checked={selectionState[character]}
										onCheckedChange={(checked) => onSelectCharacter(character, checked)}
									/>
									<Label htmlFor={character}>{character}</Label>
								</View>

								{idx < characters.length - 1 && <Divider />}
							</Fragment>
						))}

						{!characters.length && (
							<View className="p-3">
								<Text className="text-foreground-muted">No characters found</Text>
							</View>
						)}
					</View>
				</View>
			</View>
		</FilterSheet>
	)
}

const Divider = () => <View className={cn('h-px w-full bg-edge')} />
