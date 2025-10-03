import { FilterX } from 'lucide-react-native'
import { Pressable, View } from 'react-native'

import { cn } from '~/lib/utils'

import { Text } from '../ui'
import { Icon } from '../ui/icon'

type Props = {
	onPress: () => void
}

export default function ClearFilters({ onPress }: Props) {
	return (
		<Pressable onPress={onPress}>
			{({ pressed }) => (
				<View
					className={cn(
						'squircle flex flex-grow-0 flex-row items-center justify-center rounded-full bg-fill-danger-secondary px-3 py-2',
						pressed && 'opacity-70',
					)}
					style={{ flex: 0 }}
				>
					<Text>Clear</Text>
					<Icon as={FilterX} className="ml-2 h-4 w-4 text-foreground-muted" />
				</View>
			)}
		</Pressable>
	)
}
