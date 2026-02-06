import { useSDK } from '@stump/client'
import { Tabs } from 'expo-router'
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs'
import { Rss, Search } from 'lucide-react-native'
import { Platform } from 'react-native'

import { Icon as JSIcon } from '~/components/ui'
import { useOPDSLegacyFeedContext } from '~/context/opdsLegacy'
import { useColors } from '~/lib/constants'
import { cn } from '~/lib/utils'
import { usePreferencesStore } from '~/stores'

// TODO(opds): Support favorites and add a tab for it

export default function TabLayout() {
	const { sdk } = useSDK()
	const { hasSearch } = useOPDSLegacyFeedContext()

	const colors = useColors()
	const accentColor = usePreferencesStore((state) => state.accentColor)
	const animationEnabled = usePreferencesStore((state) => !state.reduceAnimations)

	if (!sdk) {
		return null
	}

	return Platform.select({
		ios: (
			<NativeTabs
				tintColor={accentColor || colors.fill.brand.DEFAULT}
				minimizeBehavior="onScrollDown"
			>
				<NativeTabs.Trigger name="feed">
					<Label>Feed</Label>
					<Icon
						sf={{ default: 'dot.radiowaves.up.forward', selected: 'dot.radiowaves.up.forward' }}
					/>
				</NativeTabs.Trigger>
				{hasSearch && (
					<NativeTabs.Trigger name="search" role="search">
						<Label>Search</Label>
						<Icon sf="magnifyingglass" />
					</NativeTabs.Trigger>
				)}
			</NativeTabs>
		),

		android: (
			<Tabs
				screenOptions={{
					tabBarActiveTintColor: colors.foreground.DEFAULT,
					animation: animationEnabled ? undefined : 'none',
				}}
			>
				<Tabs.Screen
					name="feed"
					options={{
						title: 'Feeds',
						tabBarIcon: ({ focused }) => (
							<JSIcon
								as={Rss}
								className={cn('h-6 w-6 text-foreground-muted', { 'text-foreground': focused })}
							/>
						),
						headerShown: false,
					}}
				/>

				{hasSearch ? (
					<Tabs.Screen
						name="search"
						options={{
							headerShown: false,
							title: 'Search',
							tabBarIcon: ({ focused }) => (
								<JSIcon
									as={Search}
									className={cn('h-6 w-6 text-foreground-muted', { 'text-foreground': focused })}
								/>
							),
						}}
					/>
				) : (
					<Tabs.Screen
						name="search"
						options={{
							href: null,
						}}
					/>
				)}
			</Tabs>
		),
	})
}
