import React from 'react'
import { View, StyleProp, ViewStyle } from 'react-native'

import { useColors } from '~/lib/constants'

type BorderAndShadowStyle = {
	borderRadius: number
	borderWidth: number
	shadowRadius: number
	elevation: number
}

type BorderAndShadowProps = {
	children: React.ReactNode
	style: BorderAndShadowStyle
	outerStyle?: StyleProp<ViewStyle>
	innerStyle?: StyleProp<ViewStyle>
}

/**
 * A reusable container that provides a shadow and a border.
 * The outer View handles the shadow, and the inner View handles the border and clipping.
 */
export const BorderAndShadow = ({
	children,
	style,
	outerStyle,
	innerStyle,
}: BorderAndShadowProps) => {
	const colors = useColors()

	const shadowStyle: ViewStyle = {
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.2,
		shadowRadius: style.shadowRadius,
		elevation: style.elevation, // for android
		borderRadius: style.borderRadius, // for android
	}

	const borderStyle: ViewStyle = {
		borderRadius: style.borderRadius,
		borderWidth: style.borderWidth,
		borderColor: colors.edge.DEFAULT,
		borderCurve: 'continuous',
		overflow: 'hidden',
	}

	return (
		<View style={[shadowStyle, outerStyle]}>
			<View style={[borderStyle, innerStyle]}>{children}</View>
		</View>
	)
}
