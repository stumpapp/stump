import { Button, ButtonProps, Host, Image, ImageProps } from '@expo/ui/swift-ui'
import { frame, glassEffect } from '@expo/ui/swift-ui/modifiers'
import { StyleProp, View, ViewStyle } from 'react-native'

import { useColors } from '~/lib/constants'

export type HeaderButtonProps = {
	imageProps?: ImageProps
	buttonProps?: ButtonProps
	style?: StyleProp<ViewStyle>
}

export function HeaderButton({ imageProps, buttonProps, style }: HeaderButtonProps) {
	const colors = useColors()

	const variant = buttonProps?.variant || 'glass'
	const isGlass = variant === 'glass' || variant === 'glassProminent'

	return (
		<View style={{ justifyContent: 'center', alignItems: 'center', height: 35, width: 35 }}>
			<Host matchContents style={[{ height: 35, width: 35 }, style]}>
				<Button
					{...buttonProps}
					variant={variant}
					modifiers={[
						frame({ height: 35, alignment: 'center' }),
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
					]}
				>
					<Image
						{...imageProps}
						systemName={imageProps?.systemName || 'xmark'}
						color={imageProps?.color || 'primary'}
						size={imageProps?.size || 24}
						modifiers={[frame({ height: 35 }), ...(imageProps?.modifiers || [])]}
					/>
				</Button>
			</Host>
		</View>
	)
}
