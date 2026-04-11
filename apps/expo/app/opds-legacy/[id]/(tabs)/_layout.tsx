import { useSDK } from '@stump/client'
import { NativeTabs } from 'expo-router/unstable-native-tabs'

import { useOPDSLegacyFeedContext } from '~/context/opdsLegacy'
import { useColors } from '~/lib/constants'

// TODO(opds): Support favorites and add a tab for it

export default function TabLayout() {
	const { sdk } = useSDK()
	const { hasSearch } = useOPDSLegacyFeedContext()

	const colors = useColors()

	if (!sdk) {
		return null
	}

	return (
		<NativeTabs
			minimizeBehavior="onScrollDown"
			tintColor={colors.fill.brand.DEFAULT}
			backgroundColor={colors.tabbar}
			rippleColor={colors.fill.brand.secondary}
			indicatorColor={colors.fill.brand.secondary}
			labelVisibilityMode="labeled"
		>
			<NativeTabs.Trigger name="feed">
				<NativeTabs.Trigger.Label>Feed</NativeTabs.Trigger.Label>
				<NativeTabs.Trigger.Icon
					sf={{ default: 'dot.radiowaves.up.forward', selected: 'dot.radiowaves.up.forward' }}
					md="rss_feed"
				/>
			</NativeTabs.Trigger>
			{hasSearch && (
				<NativeTabs.Trigger name="search" role="search">
					<NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
					<NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
				</NativeTabs.Trigger>
			)}
		</NativeTabs>
	)
}
