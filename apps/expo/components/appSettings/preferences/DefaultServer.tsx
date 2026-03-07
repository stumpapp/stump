import { Server } from 'lucide-react-native'

import { Picker } from '~/components/ui/picker/picker'
import { useSavedServers } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function DefaultServer() {
	const { savedServers, setDefaultServer } = useSavedServers()

	const defaultServer = savedServers.find((server) => server.defaultServer)

	return (
		<AppSettingsRow icon={Server} title="Default server">
			<Picker
				value={defaultServer?.id || 'none'}
				options={[
					{
						label: 'None',
						value: 'none',
					},
					...savedServers.map((server) => ({
						label: server.name,
						value: server.id,
					})),
				]}
				onValueChange={(value) => {
					if (value === 'none') {
						setDefaultServer(undefined)
					} else {
						setDefaultServer(value)
					}
				}}
			/>
		</AppSettingsRow>
	)
}
