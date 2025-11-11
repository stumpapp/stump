/* eslint-disable @typescript-eslint/no-require-imports */

import { Image, useWindowDimensions } from 'react-native'

import { TurboImage } from './Image'

type Props = {
	owl: keyof typeof OWLS
	height?: number
	width?: number
}

export default function Owl({ owl, ...size }: Props) {
	const { width } = useWindowDimensions()

	return (
		<TurboImage
			source={{ uri: Image.resolveAssetSource(OWLS[owl]).uri }}
			style={{
				...defaultSize(width),
				...size,
			}}
		/>
	)
}

// Each is 2125px wide by 2747px tall -> approximately 4:3 ratio
// TODO: Check iPad
const CONSTRAINT_PERCENTAGE = 0.98
const defaultSize = (width: number) => ({
	width: width * CONSTRAINT_PERCENTAGE,
	height: (width * CONSTRAINT_PERCENTAGE * 3) / 4,
})

// TODO: Commission light and dark versions of each owl
// TODO: Commission more owls:
// - Onboarding states
// - Under construction
// - Awaiting input (e.g., search)
// - Network error
// - No content empty state? (More specific than the generic empty owl)
const OWLS = {
	empty: require('../assets/images/owl-empty.png'),
	error: require('../assets/images/owl-error.png'),
}
