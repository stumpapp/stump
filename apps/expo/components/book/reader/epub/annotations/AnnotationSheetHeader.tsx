import { Check, X } from 'lucide-react-native'
import { View } from 'react-native'

import { Text } from '~/components/ui'
import { HeaderButton } from '~/components/ui/header-button/header-button'

type Props = {
	title?: string
	onClose: () => void
	onPrimaryAction: () => void
}

export default function AnnotationSheetHeader({ title, onClose, onPrimaryAction }: Props) {
	return (
		<View className="flex-row justify-between px-2 pt-4">
			<HeaderButton
				onPress={onClose}
				icon={{ ios: 'xmark', android: X }}
				ios={{ variant: 'glass' }}
			/>

			{title && <Text className="text-lg font-semibold text-foreground">{title}</Text>}

			<HeaderButton
				onPress={onPrimaryAction}
				icon={{
					ios: 'checkmark',
					android: Check,
				}}
				ios={{ variant: 'glassProminent' }}
			/>
		</View>
	)
}
