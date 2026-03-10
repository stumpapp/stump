import { Check, X } from 'lucide-react-native'
import { View } from 'react-native'

import { HeaderButton } from './header-button/header-button'
import type { HeaderButtonProps } from './header-button/types'
import { Text } from './text'

type SheetHeaderProps = {
	title?: string
	onClose?: () => void
	onSubmit?: () => void
	submitDisabled?: boolean
	closeIcon?: HeaderButtonProps['icon']
	submitIcon?: HeaderButtonProps['icon']
}

export function SheetHeader({
	title,
	onClose,
	onSubmit,
	submitDisabled,
	closeIcon = { ios: 'xmark', android: X },
	submitIcon = { ios: 'checkmark', android: Check },
}: SheetHeaderProps) {
	return (
		<View className="flex-row items-center justify-between px-2 pt-4">
			{onClose ? (
				<HeaderButton onPress={onClose} icon={closeIcon} ios={{ variant: 'glass' }} />
			) : (
				<View style={{ width: 35 }} />
			)}

			{title && <Text className="text-lg font-semibold text-foreground">{title}</Text>}

			{onSubmit ? (
				<HeaderButton
					onPress={onSubmit}
					icon={submitIcon}
					ios={{ variant: 'glassProminent' }}
					disabled={submitDisabled}
				/>
			) : (
				<View style={{ width: 35 }} />
			)}
		</View>
	)
}
