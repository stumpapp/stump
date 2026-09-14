import { Button, Host, Image } from '@expo/ui/swift-ui'
import { buttonStyle, controlSize, cornerRadius, frame, tint } from '@expo/ui/swift-ui/modifiers'
import { View } from 'react-native'

import { useColors } from '~/lib/constants'

import { HeaderButtonProps } from './types'

export function HeaderButton({
	icon = { ios: 'xmark' },
	ios: { variant } = {},
	role,
	onPress,
	style,
}: HeaderButtonProps) {
	const colors = useColors()

	return (
		<View>
			<Host matchContents style={style}>
				<Button
					role={role}
					onPress={onPress}
					modifiers={[
						controlSize('small'),
						buttonStyle(variant === 'default' ? 'plain' : (variant ?? 'plain')),
						...(variant === 'glassProminent' ? [tint(colors.fill.brand.DEFAULT)] : []),
						cornerRadius(999),
					]}
				>
					<Image
						systemName={icon?.ios || 'xmark'}
						color={icon?.color || 'primary'}
						size={icon?.size || 24}
						modifiers={[frame({ height: 35 })]}
					/>
				</Button>
			</Host>
		</View>
	)
}
