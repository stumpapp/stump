import { ScreenRootView, Text } from '@/components'

import ColorSchemeToggle from './ColorSchemeToggle'
import TabNameToggle from './TabNameToggle'

export default function AppearanceSettings() {
	return (
		<ScreenRootView classes="justify-start">
			<Text size="md" className="self-start px-4 text-left font-semibold">
				Appearance settings
			</Text>

			<TabNameToggle />
			<ColorSchemeToggle />
		</ScreenRootView>
	)
}
