import { Button, Host, Image } from '@expo/ui/swift-ui'
import { cornerRadius, frame, glassEffect } from '@expo/ui/swift-ui/modifiers'
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

	const isGlass = variant === 'glass' || variant === 'glassProminent'

	return (
		<View style={{ justifyContent: 'center', alignItems: 'center' }}>
			<Host matchContents style={[{ height: 35, width: 35 }, style]}>
				<Button
					role={role}
					onPress={onPress}
					variant={variant}
					modifiers={[
						...(isGlass
							? [
									glassEffect({
										glass: {
											variant: 'regular',
											tint:
												variant === 'glassProminent'
													? colors.fill.brand.DEFAULT
													: colors.background.DEFAULT,
										},
										shape: 'circle',
									}),
								]
							: []),
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
