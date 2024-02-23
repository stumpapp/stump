import { ScreenRootView, Text } from '@/components'

import ColorSchemeToggle from './ColorSchemeToggle'
import TabNameToggle from './TabNameToggle'

export default function AppearanceSettings() {
	return (
		<ScreenRootView>
			<Text>Appearance settings</Text>

			<TabNameToggle />
			<ColorSchemeToggle />
		</ScreenRootView>
	)
}
