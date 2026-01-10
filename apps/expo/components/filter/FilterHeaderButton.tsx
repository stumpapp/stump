import { Check, X } from 'lucide-react-native'
import { View } from 'react-native'

import { Button } from '../ui'
import { HeaderButton } from '../ui/header-button/header-button'
import { Icon as LucideIcon } from '../ui/icon'

type SupportedIcon = 'x' | 'check'

type Props = {
	icon: SupportedIcon
	variant?: 'default' | 'prominent'
	onPress: () => void
}

export default function FilterHeaderButton({ icon, onPress, variant }: Props) {
	const iosExplicitVariant = variant && variant === 'prominent' ? 'glassProminent' : undefined
	return (
		<HeaderButton
			onPress={onPress}
			ios={{
				variant: iosExplicitVariant ?? (icon === 'x' ? 'glass' : 'glassProminent'),
			}}
			android={{ variant }}
			icon={{ android: LUCIDE_ICONS[icon], ios: icon === 'x' ? 'xmark' : 'checkmark' }}
		/>
	)

	return (
		<Button
			className="squircle h-[unset] w-[unset] rounded-full border p-1 tablet:p-2"
			variant={variant === 'prominent' ? 'brand' : 'outline'}
			size="icon"
			onPress={onPress}
		>
			{({ pressed }) => (
				<View
					className="squircle items-center justify-center rounded-full"
					style={{
						height: 35,
						width: 35,
						opacity: pressed ? 0.7 : 1,
					}}
				>
					<LucideIcon as={LUCIDE_ICONS[icon]} size={24} />
				</View>
			)}
		</Button>
	)
}

const LUCIDE_ICONS: Record<SupportedIcon, typeof Check> = {
	x: X,
	check: Check,
}
