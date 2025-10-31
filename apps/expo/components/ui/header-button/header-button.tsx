import { X } from 'lucide-react-native'
import { View } from 'react-native'

import { useColors } from '~/lib/constants'

import { Button } from '../button'
import { Icon } from '../icon'
import { HeaderButtonProps } from './types'

export function HeaderButton({ icon = { android: X }, onPress, style }: HeaderButtonProps) {
	const colors = useColors()

	return (
		<Button
			className="squircle h-[unset] w-[unset] rounded-full border p-1 tablet:p-2"
			variant="ghost"
			size="icon"
			style={style}
			onPress={onPress}
		>
			{({ pressed }) => (
				<View
					className="squircle items-center justify-center rounded-full"
					style={{
						height: 35,
						width: 35,
					}}
				>
					<Icon
						as={icon?.android || X}
						size={icon?.size || 24}
						color={icon?.color || colors.foreground.DEFAULT}
						style={{
							opacity: pressed ? 0.85 : 1,
						}}
					/>
				</View>
			)}
		</Button>
	)
}
