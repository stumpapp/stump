import { View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'

import { Text, icons } from '~/components/ui'
const { Heart, Slash } = icons

export default function Screen() {
	return (
		<ScrollView className="flex-1 overflow-scroll bg-background p-4">
			<View className="flex-1 gap-8">
				<View>
					<Text className="mb-3 text-foreground-muted">Favorites</Text>

					<View className="h-24 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-edge p-3">
						<View className="relative flex justify-center">
							<View className="flex items-center justify-center rounded-lg bg-background-surface p-1.5">
								<Heart className="h-6 w-6 text-foreground-muted" />
								<Slash className="absolute h-6 w-6 scale-x-[-1] transform text-foreground opacity-80" />
							</View>
						</View>

						<Text>No favorites</Text>
					</View>
				</View>

				<View>
					<Text className="mb-3 text-foreground-muted">All</Text>
				</View>
			</View>
		</ScrollView>
	)
}
