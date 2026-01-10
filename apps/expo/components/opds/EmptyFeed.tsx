import { Rss, Slash } from 'lucide-react-native'
import { View } from 'react-native'

import { Icon, Text } from '../ui'

type Props = {
	message: string
}
export default function EmptyFeed({ message }: Props) {
	return (
		<View className="squircle h-24 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-edge p-3">
			<View className="relative flex justify-center">
				<View className="squircle flex items-center justify-center rounded-lg bg-background-surface p-2">
					<Icon as={Rss} className="h-6 w-6 text-foreground-muted" />
					<Icon
						as={Slash}
						className="absolute h-6 w-6 scale-x-[-1] transform text-foreground opacity-80"
					/>
				</View>
			</View>

			<Text>{message}</Text>
		</View>
	)
}
