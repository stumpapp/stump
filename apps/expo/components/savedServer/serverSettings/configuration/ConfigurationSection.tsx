import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { ChevronRight, Wifi } from 'lucide-react-native'

import { AppSettingsRow } from '~/components/appSettings'
import { Card, Icon } from '~/components/ui'
import { SETTINGS_COLORS } from '~/lib/constants'

import { NetworkSettingsSheet } from './NetworkSettingsSheet'

// in part this is a bit streamyfin-pilled since that is the only prior art i have but is okie
export function ConfigurationSection() {
	return (
		<>
			<Card label="Configuration">
				<AppSettingsRow
					icon={Wifi}
					iconBackgroundColor={SETTINGS_COLORS.server}
					title={'Network Settings'}
					onPress={() => TrueSheet.present('serverNetworkSettingsSheet')}
					isLink
				>
					<Icon as={ChevronRight} size={20} className="text-foreground-muted" />
				</AppSettingsRow>
			</Card>

			<NetworkSettingsSheet />
		</>
	)
}
