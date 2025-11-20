/* eslint-disable @typescript-eslint/no-require-imports */

import * as Sentry from '@sentry/react-native'
import { Asset, useAssets } from 'expo-asset'
import { useEffect, useMemo } from 'react'
import { Image, Platform, useWindowDimensions } from 'react-native'

import { useColorScheme } from '~/lib/useColorScheme'

import { TurboImage } from './Image'

type Props = {
	owl: OwlType
	height?: number
	width?: number
}

export default function Owl({ owl, ...size }: Props) {
	const { width } = useWindowDimensions()
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

	if (!assets) {
		return null
	}

	// FIXME: On Android TurboImage doesn't work with local assets in production builds
	if (Platform.OS === 'android') {
		return (
			// @ts-expect-error: It's fine
			<Image source={resolvedOwl} resizeMode="contain" style={{ ...defaultSize(width), ...size }} />
		)
	}

	return (
		<TurboImage
			// @ts-expect-error: It should be fine
			source={{ uri: resolvedOwl?.localUri || resolvedOwl?.uri }}
			style={{
				...defaultSize(width),
				...size,
			}}
		/>
	)
}

// Each is 2125px wide by 2747px tall -> approximately 4:3 ratio
const CONSTRAINT_PERCENTAGE = 0.98
const defaultSize = (width: number) => ({
	width: width * CONSTRAINT_PERCENTAGE,
	height: (width * CONSTRAINT_PERCENTAGE * 3) / 4,
})

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
