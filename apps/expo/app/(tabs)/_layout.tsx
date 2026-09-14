import { NativeTabs } from 'expo-router/unstable-native-tabs'

import { useColors } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'

export default function TabLayout() {
	const { t } = useTranslate()

	const colors = useColors()

	return (
		<NativeTabs
			minimizeBehavior="onScrollDown"
			tintColor={colors.fill.brand.DEFAULT}
			backgroundColor={colors.tabbar}
			rippleColor={colors.fill.brand.secondary}
			indicatorColor={colors.fill.brand.secondary}
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
