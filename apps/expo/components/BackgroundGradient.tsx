import { FlashListRef, ViewToken } from '@shopify/flash-list'
import { ViewabilityConfigCallbackPairs } from '@shopify/flash-list/dist/FlashListProps'
import { AnimatedProp, Canvas, Color, LinearGradient, Rect, vec } from '@shopify/react-native-skia'
import { InterfaceLayout } from '@stump/graphql'
import { getColor, serialize, set } from 'colorjs.io/fn'
import { RefObject, useCallback, useEffect } from 'react'
import { Appearance } from 'react-native'
import { useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated'

import { useDisplay } from '~/lib/hooks'
import { useColorScheme } from '~/lib/useColorScheme'
import { usePreferencesStore } from '~/stores'

import { useResolvedHeaderHeight } from './header/useAnimatedHeader'
import { useListSizing } from './listLayout'

type MinimalItem = {
	thumbnail?: {
		metadata?: {
			averageColor?: string | null
		} | null
	} | null
}

const getThumbnailColor = (item?: MinimalItem): string => {
	const isDarkColorScheme = Appearance.getColorScheme() === 'dark'
	const averageColor = item?.thumbnail?.metadata?.averageColor

	if (!averageColor) return 'transparent'

	const color = getColor(averageColor)
	set(color, {
		'oklch.l': (l) => (isDarkColorScheme ? 0.25 * Math.pow(l, 0.4) : 0.5 * l + 0.5),
		'oklch.c': (c) => 0.95 * c + 0.05 * 0.4,
	})

	return serialize(color, { format: 'hex' })
}

type BackgroundGradientProps = {
	colors: AnimatedProp<Color[]>
	layout: InterfaceLayout
}

export function BackgroundGradient({ colors, layout }: BackgroundGradientProps) {
	const { height, width } = useDisplay()
	const { tintListBackground } = usePreferencesStore()

	if (!tintListBackground) return null

	const isGrid = layout === InterfaceLayout.Grid

	const endPoint = isGrid ? vec(width, height) : vec(0, height)

	return (
		<Canvas style={{ position: 'absolute', inset: 0 }}>
			<Rect x={0} y={0} width={width} height={height}>
				<LinearGradient start={vec(0, 0)} end={endPoint} colors={colors} />
			</Rect>
		</Canvas>
	)
}

type Props<T> = {
	data: T[]
	layout: InterfaceLayout
	flashListRef: RefObject<FlashListRef<T> | null>
}

export function useBackgroundGradient<T extends MinimalItem>({
	data,
	layout,
	flashListRef,
}: Props<T>) {
	const { height: displayHeight } = useDisplay()
	const headerHeight = useResolvedHeaderHeight()
	const { estimatedItemHeight, numColumns } = useListSizing({ layout })
	const { isDarkColorScheme } = useColorScheme()

	const { tintListBackground } = usePreferencesStore()

	useEffect(() => {
		flashListRef.current?.recomputeViewableItems()
	}, [flashListRef, isDarkColorScheme])

	const isGrid = layout === InterfaceLayout.Grid

	// stats header height is approx 50px (assuming one row of stats)
	const visibleRowsTotalStartHeight = displayHeight - headerHeight - 50
	// ItemSeparatorComponent h-6 = 21px
	const rowHeight = estimatedItemHeight + (isGrid ? 0 : 21)
	const estimatedVisibleItemCount = Math.min(
		data.length,
		Math.floor(visibleRowsTotalStartHeight / rowHeight) * numColumns,
	)

	const firstColor = useSharedValue(getThumbnailColor(data.at(0)))
	const lastColor = useSharedValue(getThumbnailColor(data.at(estimatedVisibleItemCount - 1)))

	const colors = useDerivedValue(() => {
		return [firstColor.value, lastColor.value]
	}, [])

	const onViewableItemsChanged = useCallback(
		({ viewableItems }: { viewableItems: ViewToken<T>[] }) => {
			if (viewableItems.length === 0 || !tintListBackground) return

			const scrollOffset = flashListRef.current?.getAbsoluteLastScrollOffset() ?? 0
			// we don't want the first visible item because that's often under the header
			// TODO: but just selecting the second item isn't a very accurate way to do it
			const firstIndex = scrollOffset <= 0 || isGrid ? 0 : 1

			const newFirstColor = getThumbnailColor(viewableItems.at(firstIndex)?.item)
			const newLastColor = getThumbnailColor(viewableItems.at(-1)?.item)

			firstColor.set(withTiming(newFirstColor, { duration: 800 }))
			lastColor.set(withTiming(newLastColor, { duration: 800 }))
		},
		[firstColor, lastColor, isGrid, flashListRef, tintListBackground],
	)

	const viewabilityConfig = { itemVisiblePercentThreshold: isGrid ? 70 : 30, minimumViewTime: 800 }

	const viewabilityConfigCallbackPairs = [
		{ onViewableItemsChanged, viewabilityConfig },
	] satisfies ViewabilityConfigCallbackPairs<T>

	return {
		colors,
		viewabilityConfigCallbackPairs,
	}
}
