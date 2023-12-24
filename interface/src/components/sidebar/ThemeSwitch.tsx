import { useTheme } from '@stump/client'
import { cn, RawSwitch, Text } from '@stump/components'
import { Moon } from 'lucide-react'
import React from 'react'

type Props = {
	showIcon?: boolean
	activeOnHover?: boolean
	className?: string
}
export default function ThemeSwitch({ showIcon = true, activeOnHover = true, className }: Props) {
	const { isDark, toggleTheme } = useTheme()

	return (
		<label
			className={cn(
				'text-contrast-200 flex h-[2.35rem] w-full items-center justify-between px-2',
				{
					'hover:bg-sidebar-300': activeOnHover,
				},
				className,
			)}
			form="dark-mode-toggle"
		>
			<div className="flex items-center gap-1.5">
				{showIcon && <Moon className="h-4 w-4" />}
				<Text className="select-none" size="sm" variant="label">
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
