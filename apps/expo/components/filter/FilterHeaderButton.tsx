import { Check, X } from 'lucide-react-native'
import { View } from 'react-native'

import { Button } from '../ui'
import { Icon as LucideIcon } from '../ui/icon'

// TODO: Return native buttons for iOS

type SupportedIcon = 'x' | 'check'

type Props = {
	icon: SupportedIcon
	variant?: 'default' | 'prominent'
	onPress: () => void
}

export default function FilterHeaderButton({ icon, onPress, variant }: Props) {
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
