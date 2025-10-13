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
	query Characters($seriesId: ID) {
		mediaMetadataOverview(seriesId: $seriesId) {
			characters
		}
	}
`)

export default function Characters() {
	const insets = useSafeAreaInsets()

	const { seriesId } = useBookFilterHeaderContext()
	const { data, isPending } = useGraphQL(query, ['characters', seriesId], { seriesId })

	const characters = data?.mediaMetadataOverview?.characters ?? []

	const sheetRef = useRef<FilterSheetRef>(null)

	const { filters, setFilters } = useBookFilterStore((store) => ({
		filters: store.filters,
		setFilters: store.setFilters,
	}))

	const characterFilter = useMemo(
		() => filters.metadata?.characters?.likeAnyOf,
		[filters.metadata?.characters?.likeAnyOf],
	)

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

	const onSelectCharacter = useCallback((character: string, checked: boolean) => {
		setSelectionState((prev) => ({
			...prev,
			[character]: checked,
		}))
	}, [])

	const onSubmitChanges = useCallback(() => {
		const selectedCharacters = Object.entries(selectionState)
			.filter(([, isSelected]) => isSelected)
			.map(([character]) => character)

		sheetRef.current?.close()

		if (selectedCharacters.length) {
			const adjustedFilters = setProperty(
				clone(filters),
				`metadata.characters.likeAnyOf`,
				selectedCharacters,
			)
			setFilters(adjustedFilters)
		} else {
			const adjustedFilters = setProperty(clone(filters), `metadata.characters`, undefined)
			setFilters(adjustedFilters)
		}
	}, [filters, setFilters, selectionState])

	const isActive =
		!!filters.metadata?.characters?.likeAnyOf && filters.metadata.characters.likeAnyOf.length > 0

	useEffect(() => {
		// Sync local selection state with global filters (in case of external changes, e.g. clear filters)
		const newState = match(characterFilter)
			.with(P.array(P.string), (likeAnyOf) =>
				likeAnyOf.reduce(
					(acc, character) => ({ ...acc, [character]: true }),
					{} as Record<string, boolean>,
				),
			)
			.otherwise(() => ({}) as Record<string, boolean>)
		setSelectionState(newState)
	}, [characterFilter])

	if (isPending) return null

	return (
		<FilterSheet
			ref={sheetRef}
			label="Characters"
			isActive={isActive}
			header={
				<View className="flex flex-row items-center justify-between">
					<FilterHeaderButton icon="x" onPress={() => sheetRef.current?.close()} />

					<Text size="lg" className="font-medium tracking-wide text-foreground-subtle">
						Characters
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
					<Text>Available Characters</Text>

					<View className="squircle gap-0 rounded-lg border border-edge bg-background-surface">
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
