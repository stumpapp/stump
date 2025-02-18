import { ChevronRight } from 'lucide-react-native'
import { View } from 'react-native'

import { Text } from '~/components/ui'
import { useSavedServers } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function DefaultServer() {
	const { savedServers } = useSavedServers()

	const defaultServer = savedServers.find((server) => server.defaultServer)

	return (
		<AppSettingsRow icon="Server" title="Default server">
			<View className="flex flex-row items-center gap-2">
				<Text className="text-foreground-muted">{defaultServer ? defaultServer.name : 'None'}</Text>
				<ChevronRight size={20} className="text-foreground-muted" />
			</View>
		</AppSettingsRow>
	)
}
