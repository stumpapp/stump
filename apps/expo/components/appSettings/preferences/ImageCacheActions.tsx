import { useEffect, useState } from 'react'
import { View } from 'react-native'
import TurboImage from 'react-native-turbo-image'

import { Button, Dialog, Text } from '~/components/ui'

import AppSettingsRow from '../AppSettingsRow'

export default function CachePolicySelect() {
	const [dialogMessage, setDialogMessage] = useState<string | null>(null)

	useEffect(() => {
		if (!dialogMessage) return
		const dialogTimer = setTimeout(() => {
			setDialogMessage(null)
		}, 1000)
		return () => clearTimeout(dialogTimer)
	}, [dialogMessage])

	return (
		<>
			<AppSettingsRow icon="Image" title="Clear Cache">
				<View className="flex-row gap-2">
					<Button
						size="sm"
						variant="destructive"
						onPress={async () => {
							await TurboImage.clearMemoryCache()
							setDialogMessage('Memory cache cleared')
						}}
					>
						<Text className="text-foreground">Memory</Text>
					</Button>
					<Button
						size="sm"
						variant="destructive"
						onPress={async () => {
							await TurboImage.clearDiskCache()
							setDialogMessage('Disk cache cleared')
						}}
					>
						<Text className="text-foreground">Disk</Text>
					</Button>
				</View>
			</AppSettingsRow>

			<Dialog open={!!dialogMessage} onOpenChange={() => setDialogMessage(null)}>
				<Dialog.Content>
					<Dialog.Title>Cache Cleared</Dialog.Title>
					<Dialog.Description>{dialogMessage}</Dialog.Description>
				</Dialog.Content>
			</Dialog>
		</>
	)
}
