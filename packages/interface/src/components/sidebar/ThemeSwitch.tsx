import { useTheme } from '@stump/client'
import { RawSwitch, Text } from '@stump/components'
import { Moon } from 'lucide-react'
import React from 'react'

export default function ThemeSwitch() {
	const { isDark, toggleTheme } = useTheme()

	return (
		<label
			className="flex h-[2.35rem] w-full items-center justify-between px-2 dark:hover:bg-gray-900"
			form="dark-mode-toggle"
		>
			<div className="flex items-center gap-1.5">
				<Moon className="h-4 w-4 dark:text-gray-150" />
				<Text className="select-none" size="sm">
					Dark mode
				</Text>
			</div>

			<RawSwitch
				id="dark-mode-toggle"
				checked={isDark}
				onClick={toggleTheme}
				size="xs"
				variant="primary"
			/>
		</label>
	)
}
