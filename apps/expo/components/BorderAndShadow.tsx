import React from 'react'
import { Platform, View, ViewStyle } from 'react-native'

import { useColors } from '~/lib/constants'

export type BorderAndShadowStyle = {
	borderRadius: number
	borderWidth: number
	shadowRadius: number
	shadowColor: string
	shadowOffset: { width: number; height: number }
}

type BorderAndShadowProps = {
	children: React.ReactNode
	style: BorderAndShadowStyle
}

/**
 * A reusable container that provides a shadow and a border.
 * The outer View handles the shadow, the inner View handles the clipping, and the we overlay a border on top.
 */
export const BorderAndShadow = ({ children, style }: BorderAndShadowProps) => {
	const colors = useColors()

	const shadowStyle: ViewStyle | undefined = Platform.select({
		// while boxShadow can be used on ios, it does not respect borderCurve: 'continuous', so we don't.
		android: {
			borderRadius: style.borderRadius,
			boxShadow: [
				{
					offsetX: style.shadowOffset.width,
					offsetY: style.shadowOffset.height,
					blurRadius: style.shadowRadius,
					color: style.shadowColor,
				},
			],
		},
		ios: {
			shadowColor: style.shadowColor,
			shadowOffset: style.shadowOffset,
			shadowOpacity: 1, // need to use 1 but the actual used opacity is set in shadowColor
			shadowRadius: style.shadowRadius,
		},
	})

	const clippingStyle: ViewStyle = {
		borderRadius: style.borderRadius,
		borderCurve: 'continuous',
		overflow: 'hidden',
	}

	const borderStyle: ViewStyle = {
		position: 'absolute',
		inset: 0,
		borderRadius: style.borderRadius,
		borderWidth: style.borderWidth,
		borderColor: colors.thumbnail.border,
		borderCurve: 'continuous',
		overflow: 'hidden',
		zIndex: 25,
	}

	return (
		<View style={shadowStyle}>
			<View style={clippingStyle}>{children}</View>
			<View style={borderStyle} />
		</View>
	)
}
