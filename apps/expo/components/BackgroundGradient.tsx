import { FlashListRef, ViewToken } from '@shopify/flash-list'
import { ViewabilityConfigCallbackPairs } from '@shopify/flash-list/dist/FlashListProps'
import { AnimatedProp, Canvas, Color, LinearGradient, Rect, vec } from '@shopify/react-native-skia'
import { getThumbnailTintColor } from '@stump/client'
import { InterfaceLayout } from '@stump/graphql'
import { useNavigation } from 'expo-router'
import { RefObject, useCallback, useEffect } from 'react'
import { Appearance, Platform } from 'react-native'
import Animated, {
	SharedValue,
	useAnimatedStyle,
	useDerivedValue,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated'

import { IS_IOS_26_PLUS } from '~/lib/constants'
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

type BackgroundGradientProps = {
	colors: AnimatedProp<Color[]>
	androidHeaderColor?: SharedValue<string>
	layout: InterfaceLayout
}

export function BackgroundGradient({
	colors,
	androidHeaderColor,
	layout,
}: BackgroundGradientProps) {
	const { height, width } = useDisplay()
	const { tintListBackground } = usePreferencesStore()
	const naviation = useNavigation()

	useEffect(() => {
		if (Platform.OS === 'android' && androidHeaderColor && tintListBackground) {
			naviation.setOptions({
				headerBackground: () => <AnimatedHeaderBackground color={androidHeaderColor} />,
			})
		}
	}, [androidHeaderColor, naviation, tintListBackground])

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

	const firstColor = useSharedValue(getTintColor(data.at(0)))
	const lastColor = useSharedValue(getTintColor(data.at(estimatedVisibleItemCount - 1)))

	const colors = useDerivedValue(() => {
		return [firstColor.value, lastColor.value]
	}, [])

	const onViewableItemsChanged = useCallback(
		({ viewableItems }: { viewableItems: ViewToken<T>[] }) => {
			if (viewableItems.length === 0 || !tintListBackground) return

			// distance between top edge of first item and top edge of display
			// positive if top edge of first item is outside viewport
			const firstItemToDisplay =
				(flashListRef.current?.getAbsoluteLastScrollOffset() ?? 0) -
				(flashListRef.current?.getFirstItemOffset() ?? 0)

			// ios 26 has transparent headers, so the second row is where we want to grab colours from
			const trulyViewableItems = !IS_IOS_26_PLUS
				? viewableItems
				: viewableItems.filter((item, index) => {
						if (item.index === null) return false
						// approve items past the first viewableItems row
						if (index >= numColumns) return true

						const layout = flashListRef.current?.getLayout(item.index)
						const firstItemToItem = layout?.y ?? 0
						const displayToItem = firstItemToItem - firstItemToDisplay
						const itemHeight = layout?.height ?? 0
						// 70% below the header is probably "truly viewable"
						return displayToItem > headerHeight - itemHeight * (1 - 0.7)
					})

			const activeItems = trulyViewableItems.length > 0 ? trulyViewableItems : viewableItems

			const newFirstColor = getTintColor(activeItems.at(0)?.item)
			const newLastColor = getTintColor(activeItems.at(-1)?.item)

			firstColor.set(withTiming(newFirstColor, { duration: 800 }))
			lastColor.set(withTiming(newLastColor, { duration: 800 }))
		},
		[firstColor, lastColor, flashListRef, tintListBackground, headerHeight, numColumns],
	)

	const viewabilityConfig = { itemVisiblePercentThreshold: isGrid ? 50 : 70, minimumViewTime: 800 }

	const viewabilityConfigCallbackPairs = [
		{ onViewableItemsChanged, viewabilityConfig },
	] satisfies ViewabilityConfigCallbackPairs<T>

	return {
		colors,
		headerColor: firstColor,
		viewabilityConfigCallbackPairs,
	}
}

function getTintColor(item?: MinimalItem): string {
	const isDarkColorScheme = Appearance.getColorScheme() === 'dark'
	const averageColor = item?.thumbnail?.metadata?.averageColor

	if (!averageColor) return 'transparent'

	return getThumbnailTintColor(averageColor, { dark: isDarkColorScheme })
}

function AnimatedHeaderBackground({ color }: { color: SharedValue<string> }) {
	const animatedStyle = useAnimatedStyle(() => ({ backgroundColor: color.value }))
	return <Animated.View style={[{ flex: 1 }, animatedStyle]} />
}
