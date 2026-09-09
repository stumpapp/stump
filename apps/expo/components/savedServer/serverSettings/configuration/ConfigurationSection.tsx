import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { ChevronRight, Wifi } from 'lucide-react-native'

import { AppSettingsRow } from '~/components/appSettings'
import { Card, Icon } from '~/components/ui'
import { SETTINGS_COLORS } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'

import { NetworkSettingsSheet } from './NetworkSettingsSheet'

export function ConfigurationSection() {
	const { t } = useTranslate()

	return (
		<>
			<Card label={t('serverSettingsSheet.configuration.label')}>
				<AppSettingsRow
					icon={Wifi}
					iconBackgroundColor={SETTINGS_COLORS.server}
					title={t('serverSettingsSheet.configuration.networkSettings')}
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
