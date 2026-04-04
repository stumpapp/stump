import { Server } from 'lucide-react-native'

import { Picker } from '~/components/ui/picker/picker'
import { useTranslate } from '~/lib/hooks'
import { useSavedServers } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function DefaultServer() {
	const { t } = useTranslate()
	const { savedServers, setDefaultServer } = useSavedServers()

	const defaultServer = savedServers.find((server) => server.defaultServer)

	return (
		<AppSettingsRow icon={Server} title={t('settings.preferences.defaultServer')}>
			<Picker
				value={defaultServer?.id || 'none'}
				options={[
					{
						label: t('common.none'),
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
