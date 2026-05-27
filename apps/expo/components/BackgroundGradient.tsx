import { FlashListRef, ViewToken } from '@shopify/flash-list'
import { ViewabilityConfigCallbackPairs } from '@shopify/flash-list/dist/FlashListProps'
import { InterfaceLayout } from '@stump/graphql'
import { MeshGradientView, MeshGradientViewProps } from 'expo-mesh-gradient'
import { RefObject, useCallback } from 'react'
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated'

const AnimatedMeshGradientView = Animated.createAnimatedComponent(MeshGradientView)

export function BackgroundGradient({ animatedProps }: { animatedProps: MeshGradientViewProps }) {
	return (
		<AnimatedMeshGradientView
			columns={2}
			rows={2}
			points={[
				[0, 0],
				[1, 0],
				[0, 1],
				[1, 1],
			]}
			animatedProps={animatedProps}
			style={{ position: 'absolute', inset: 0 }}
		/>
	)
}

type MinimalMediaItem = {
	thumbnail?: {
		metadata?: {
			averageColor?: string | null
		} | null
	} | null
}

type Props<T> = {
	layout: InterfaceLayout
	flashListRef: RefObject<FlashListRef<T> | null>
}

export function useBackgroundGradient<T extends MinimalMediaItem>({
	layout,
	flashListRef,
}: Props<T>) {
	const isGrid = layout === InterfaceLayout.Grid

	// TODO: what to start with? keep as is (fades colours in), or use estimate lastItem with itemHeight + ItemSeparatorComponent height.
	const firstColor = useSharedValue('transparent')
	const lastColor = useSharedValue('transparent')

	const animatedProps = useAnimatedProps(() => {
		return { colors: [firstColor.value, firstColor.value, lastColor.value, lastColor.value] }
	})

	const onViewableItemsChanged = useCallback(
		({ viewableItems }: { viewableItems: ViewToken<T>[] }) => {
			if (viewableItems.length > 0) {
				const scrollOffset = flashListRef.current?.getAbsoluteLastScrollOffset() ?? 0
				// we don't want the first visible item because that's often under the header
				// TODO: but just selecting the second item isn't a very accurate way to do it
				const firstIndex = scrollOffset <= 0 || isGrid ? 0 : 1

				const firstItem = viewableItems.at(firstIndex)?.item
				const lastItem = viewableItems.at(-1)?.item

				//TODO: use color-js for better light + dark colours
				const newFirstColor = firstItem?.thumbnail?.metadata?.averageColor + 'c0' || 'transparent'
				const newLastColor = lastItem?.thumbnail?.metadata?.averageColor + 'c0' || 'transparent'

				firstColor.set(withTiming(newFirstColor, { duration: 800 }))
				lastColor.set(withTiming(newLastColor, { duration: 800 }))
			}
		},
		[firstColor, lastColor, isGrid, flashListRef],
	)

	const viewabilityConfig = { itemVisiblePercentThreshold: isGrid ? 70 : 30, minimumViewTime: 800 }

	const viewabilityConfigCallbackPairs = [
		{ onViewableItemsChanged, viewabilityConfig },
	] satisfies ViewabilityConfigCallbackPairs<T>

	return {
		animatedProps,
		viewabilityConfigCallbackPairs,
	}
}
