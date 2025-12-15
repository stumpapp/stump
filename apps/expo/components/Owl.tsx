/* eslint-disable @typescript-eslint/no-require-imports */

import { useHeaderHeight } from '@react-navigation/elements'
import * as Sentry from '@sentry/react-native'
import { Asset, useAssets } from 'expo-asset'
import { useEffect, useMemo } from 'react'
import { Image, Platform, useWindowDimensions } from 'react-native'

import { useDisplay } from '~/lib/hooks'
import { useColorScheme } from '~/lib/useColorScheme'

import { TurboImage } from './image'

type Props = {
	owl: OwlType
	height?: number
	width?: number
}

export default function Owl({ owl, ...size }: Props) {
	const { width, height } = useWindowDimensions()
	const { isDarkColorScheme } = useColorScheme()

	const [assets, error] = useAssets(OWL_REQUIRES)

	const resolvedOwl = useMemo(
		() => getOwl(owl, assets || [], isDarkColorScheme),
		[owl, assets, isDarkColorScheme],
	)

	useEffect(() => {
		if (error) {
			Sentry.captureException(error, { tags: { component: 'Owl' } })
		}
	}, [error])

	const defaultStyle = useMemo(() => defaultSize(width, height), [width, height])

	if (!assets) {
		return null
	}

	// FIXME: On Android TurboImage doesn't work with local assets in production builds
	if (Platform.OS === 'android') {
		return (
			// @ts-expect-error: It's fine
			<Image source={resolvedOwl} resizeMode="contain" style={{ ...defaultStyle, ...size }} />
		)
	}

	return (
		<TurboImage
			// @ts-expect-error: It should be fine
			source={{ uri: resolvedOwl?.localUri || resolvedOwl?.uri }}
			style={{
				...defaultStyle,
				...size,
			}}
		/>
	)
}

// Each is approx 2645 × 2757 pixels -> approximately 1:1 (slightly taller than wide)
const CONSTRAINT_PERCENTAGE_PORTRAIT = 0.8
const CONSTRAINT_PERCENTAGE_LANDSCAPE = 0.5
const ASPECT_RATIO = 2645 / 2757 // ~0.959

const defaultSize = (width: number, height: number) => {
	const isLandscape = width > height
	if (isLandscape) {
		return {
			height: height * CONSTRAINT_PERCENTAGE_LANDSCAPE,
			width: height * CONSTRAINT_PERCENTAGE_LANDSCAPE * ASPECT_RATIO,
		}
	}
	return {
		width: width * CONSTRAINT_PERCENTAGE_PORTRAIT,
		height: (width * CONSTRAINT_PERCENTAGE_PORTRAIT) / ASPECT_RATIO,
	}
}

// TODO: Commission more owls:
// - Onboarding states
// - Under construction
// - Awaiting input (e.g., search)
// - Network error
// - No content empty state? (More specific than the generic empty owl)

type OwlType = 'empty' | 'error'

const OWL_REQUIRES = [
	require('../assets/images/owls/owl-basic-empty-dark.png'),
	require('../assets/images/owls/owl-basic-empty-light.png'),
	require('../assets/images/owls/owl-error-dark.png'),
	require('../assets/images/owls/owl-error-light.png'),
]

const getOwl = (owl: OwlType, assets: Array<Asset>, isDark: boolean): Asset | undefined => {
	switch (owl) {
		case 'empty':
			return isDark ? assets[0] : assets[1]
		case 'error':
			return isDark ? assets[2] : assets[3]
	}
}

// Hook to get style object for applying header offset in landscape on iOS, since transparent
// headers overlap content there.
export const useOwlHeaderOffset = () => {
	const { isLandscape } = useDisplay()
	const headerHeight = useHeaderHeight()
	return isLandscape && Platform.OS === 'ios' ? { paddingTop: headerHeight } : undefined
}
