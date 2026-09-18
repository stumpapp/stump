import { Easing } from 'react-native'
import { easeGradient } from 'react-native-easing-gradient'
import { LinearGradientProps } from 'react-native-linear-gradient'

export const READING_GRADIENT = easeGradient({
	colorStops: {
		0.8: { color: 'transparent' },
		1: { color: 'rgba(0, 0, 0, 0.70)' },
	},
	extraColorStopsPerTransition: 16,
	easing: Easing.bezier(0, 0, 1, 0.7),
}) satisfies LinearGradientProps

export const COMPLETED_GRADIENT = {
	...easeGradient({
		colorStops: {
			0.7: { color: 'transparent' },
			1: { color: 'rgba(0, 0, 0, 0.70)' },
		},
		extraColorStopsPerTransition: 16,
		easing: Easing.bezier(0.4, 0, 0.6, 1),
	}),
	useAngle: true,
	angle: 150,
} satisfies LinearGradientProps

export const REREADING_GRADIENT = {
	...easeGradient({
		colorStops: {
			0.7: { color: 'transparent' },
			1: { color: 'rgba(0, 0, 0, 0.70)' },
		},
		extraColorStopsPerTransition: 16,
		easing: Easing.bezier(0, 0, 0.6, 1),
	}),
	useAngle: true,
	angle: 165,
} satisfies LinearGradientProps
