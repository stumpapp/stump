import { FlashList } from '@shopify/flash-list'
import { useRefetch, useSuspenseGraphQL } from '@stump/client'
import { graphql, SmartListScreenQuery } from '@stump/graphql'
// import {
// 	clone,
// 	ColorSpace,
// 	darken,
// 	getColor,
// 	Lab,
// 	lighten,
// 	OKLab,
// 	PlainColorObject,
// 	serialize,
// 	set,
// 	sRGB,
// 	steps,
// } from 'colorjs.io/fn'
import { useLocalSearchParams } from 'expo-router'
import { useCallback, useMemo } from 'react'
import { View } from 'react-native'
import { match } from 'ts-pattern'

import { useActiveServer } from '~/components/activeServer'
import RefreshControl from '~/components/RefreshControl'
import { SmartListBookItem, SmartListGroupItem } from '~/components/smartList'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'
import { useSmartListGroupStore } from '~/stores/smartList'

// ColorSpace.register(sRGB)
// ColorSpace.register(Lab)
// ColorSpace.register(OKLab)

const query = graphql(`
	query SmartListScreen($id: ID!) {
		smartListById(id: $id) {
			id
			name
			description
			items {
				__typename
				... on SmartListGrouped {
					items {
						entity {
							__typename
							... on Series {
								id
								resolvedName
							}
							... on Library {
								id
								name
							}
						}
						books {
							id
							thumbnail {
								url
								metadata {
									averageColor
									colors {
										color
										percentage
									}
									thumbhash
								}
							}
							...SmartListBookItem
						}
					}
				}
				... on SmartListUngrouped {
					books {
						id
						thumbnail {
							url
							metadata {
								averageColor
								colors {
									color
									percentage
								}
								thumbhash
							}
						}
						...SmartListBookItem
					}
				}
			}
		}
	}
`)

type Book = Extract<
	NonNullable<SmartListScreenQuery['smartListById']>['items'],
	{ __typename: 'SmartListUngrouped' }
>['books'][number]

type ListData = (string | Book)[] // https://shopify.github.io/flash-list/docs/guides/section-list/

export default function Screen() {
	const { id } = useLocalSearchParams<{ id: string }>()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const {
		data: { smartListById: smartList },
		refetch,
	} = useSuspenseGraphQL(query, ['smartListById', id, serverID], { id })

	const [isRefreshing, onRefresh] = useRefetch(refetch)

	const collapsedItems = useSmartListGroupStore(
		(state) => state.collapsedGroupsByList.get(id) || new Set(),
	)

	const toggleGroup = useSmartListGroupStore((state) => state.toggleGroup)
	const onToggleGroup = useCallback(
		(groupName: string) => {
			toggleGroup(id, groupName)
		},
		[id, toggleGroup],
	)

	useDynamicHeader({
		title: smartList?.name || '',
	})

	const data = useMemo(() => {
		if (!smartList) return []

		return match(smartList.items)
			.with({ __typename: 'SmartListUngrouped' }, (ungrouped) => {
				return ungrouped.books
			})
			.with({ __typename: 'SmartListGrouped' }, (grouped) => {
				const listData: ListData = []

				for (const groupItem of grouped.items) {
					const entityName = match(groupItem.entity)
						.with({ __typename: 'Series' }, (series) => series.resolvedName)
						.with({ __typename: 'Library' }, (library) => library.name)
						.otherwise(() => '')

					// If the group is collapsed, only add the header
					if (collapsedItems.has(entityName)) {
						listData.push(entityName)
						continue
					}

					if (entityName) {
						listData.push(entityName)
					}

					listData.push(...groupItem.books)
				}

				return listData
			})
			.exhaustive() // I want to throw here so I know if something if wrong
	}, [smartList, collapsedItems])

	const stickyHeaderIndices = useMemo(() => {
		const indices: number[] = []
		let currentIndex = 0
		for (const item of data) {
			if (typeof item === 'string') {
				indices.push(currentIndex)
			}
			currentIndex++
		}
		return indices
	}, [data])

	// TODO: I struggled to get the look I was aiming for, ideally I want the native router
	// decorations inside the gradient header, but my (admittedly few) attempts didn't
	// look great. I'll give it another go before merge
	// const { isDarkColorScheme } = useColorScheme()
	// const { accentColor } = usePreferencesStore((state) => ({ accentColor: state.accentColor }))

	// const firstFiveBooks = useMemo(
	// 	() => data.filter((item): item is Book => typeof item !== 'string').slice(0, 5),
	// 	[data],
	// )
	// const backgroundGradient = useMemo(() => {
	// 	const avgColors = firstFiveBooks.map((book) => book.thumbnail.metadata?.averageColor)

	// 	const midIndex = avgColors.length === 5 ? 2 : avgColors.length === 3 ? 1 : undefined

	// 	// 3 or 5 thumbnails -> 3 colours
	// 	// 2 or 4 thumbnails -> 2 colours
	// 	// 1 thumbnail / accentColor -> generate lighter and darker to interpolate between
	// 	let usableColors: string[] | undefined
	// 	if (avgColors.at(0) && midIndex && avgColors.at(midIndex) && avgColors.at(-1)) {
	// 		usableColors = [avgColors.at(0)!, avgColors.at(midIndex)!, avgColors.at(-1)!]
	// 	} else if (avgColors.at(0) && avgColors.at(-1)) {
	// 		usableColors = [avgColors.at(0)!, avgColors.at(-1)!]
	// 	}

	// 	if (usableColors) {
	// 		const plainColors: PlainColorObject[] = usableColors.map((c) => getColor(c))

	// 		if (avgColors.length === 1) {
	// 			darken(plainColors[0] || '', 0.2)
	// 			lighten(plainColors[1] || '', 0.2)
	// 		}

	// 		const gradient: string[] = []
	// 		for (let i = 0; i < plainColors.length - 1; i++) {
	// 			const interpolation = steps(plainColors[i] || '', plainColors[i + 1] || '', {
	// 				space: OKLab,
	// 				outputSpace: sRGB,
	// 				steps: 5,
	// 			}).map((c) => {
	// 				darken(c, isDarkColorScheme ? 0.5 : 0.1)
	// 				return serialize(c, { format: 'hex' })
	// 			})
	// 			gradient.push(...interpolation)
	// 		}
	// 		return gradient
	// 	} else if (accentColor) {
	// 		const darkerColor = getColor(accentColor)
	// 		const lighterColor = clone(darkerColor)

	// 		return [darkerColor, lighterColor].map((c, index) => {
	// 			set(c, {
	// 				'oklch.l': isDarkColorScheme ? (index === 0 ? 0.26 : 0.38) : index === 0 ? 0.68 : 0.8,
	// 				'oklch.c': 0.04,
	// 			})
	// 			return serialize(c, { format: 'hex' })
	// 		})
	// 	}

	// 	return undefined
	// }, [firstFiveBooks, isDarkColorScheme, accentColor])

	const renderItem = useCallback(
		({ item }: { item: ListData[number] }) => {
			if (typeof item === 'string') {
				return (
					<SmartListGroupItem
						title={item}
						isCollapsed={collapsedItems.has(item)}
						onToggleCollapse={() => onToggleGroup(item)}
					/>
				)
			}
			return <SmartListBookItem book={item} />
		},
		[collapsedItems, onToggleGroup],
	)

	if (!smartList) return null

	// TODO: Better design, incorporate user-defined description and maybe gradient colors
	// TODO: Support quick text filtering (fuzzy search)
	return (
		<FlashList
			data={data}
			// extraData={[collapsedItems]}
			renderItem={renderItem}
			getItemType={(item) => (typeof item === 'string' ? 'sectionHeader' : 'row')}
			keyExtractor={(item, index) => {
				return typeof item === 'string' ? `section-${item}-${index}` : `book-${item.id}`
			}}
			contentContainerStyle={{
				paddingVertical: 16,
			}}
			ItemSeparatorComponent={() => <View className="h-6" />}
			// ListHeaderComponent={
			// 	<SmartListHeader
			// 		name={smartList.name}
			// 		description={smartList.description}
			// 		gradientColors={backgroundGradient}
			// 	/>
			// }
			// FIXME: Sticks to very top behind header on iOS
			stickyHeaderIndices={stickyHeaderIndices}
			maintainVisibleContentPosition={{ disabled: true }}
			contentInsetAdjustmentBehavior="always"
			refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
		/>
	)
}
