import { Tabs } from 'expo-router'
import { NativeTabs } from 'expo-router/unstable-native-tabs'
import { HardDriveDownload, Server, Settings } from 'lucide-react-native'
import { Platform } from 'react-native'

import { AddServerDialog } from '~/components/savedServer'
import { Icon as JSIcon } from '~/components/ui'
import { useColors } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { cn } from '~/lib/utils'
import { usePreferencesStore } from '~/stores'

export default function TabLayout() {
	const { t } = useTranslate()

	const colors = useColors()
	const accentColor = usePreferencesStore((state) => state.accentColor)

	return (
		<NativeTabs
			minimizeBehavior="onScrollDown"
			tintColor={colors.fill.brand.DEFAULT}
			backgroundColor={colors.tabbar}
			rippleColor={colors.fill.brand.secondary}
			labelVisibilityMode="labeled"
		>
			<NativeTabs.Trigger name="index">
				<NativeTabs.Trigger.Label>{t('tabs.servers')}</NativeTabs.Trigger.Label>
				<NativeTabs.Trigger.Icon sf="server.rack" md="database" />
			</NativeTabs.Trigger>
			<NativeTabs.Trigger name="library">
				<NativeTabs.Trigger.Label>{t('tabs.localLibrary')}</NativeTabs.Trigger.Label>
				<NativeTabs.Trigger.Icon sf="books.vertical" md="newsstand" />
			</NativeTabs.Trigger>
			<NativeTabs.Trigger name="settings">
				<NativeTabs.Trigger.Label>{t('tabs.settings')}</NativeTabs.Trigger.Label>
				<NativeTabs.Trigger.Icon sf="gear" md="settings" />
			</NativeTabs.Trigger>
		</NativeTabs>
	)
}
