import { Image } from 'lucide-react-native'
import { Alert, View } from 'react-native'
import TurboImage from 'react-native-turbo-image'

import { Button, Text } from '~/components/ui'

import AppSettingsRow from '../AppSettingsRow'

export default function CachePolicySelect() {
	const onClearCache = async (message: string) => {
		Alert.alert(message)
	}

	return (
		<AppSettingsRow icon={Image} title="Clear Cache">
			<View className="flex-row gap-2">
				<Button
					size="sm"
					variant="destructive"
					onPress={async () => {
						await TurboImage.clearMemoryCache()
						onClearCache('Memory cache cleared')
					}}
				>
					<Text>Memory</Text>
				</Button>
				<Button
					size="sm"
					variant="destructive"
					onPress={async () => {
						await TurboImage.clearDiskCache()
						onClearCache('Disk cache cleared')
					}}
				>
					<Text>Disk</Text>
				</Button>
			</View>
		</AppSettingsRow>
	)
}
