import { LucideIcon } from 'lucide-react'

import { cn } from '../utils'
import { StatColorPalette } from './colors'

export type StatCardProps = {
	icon?: LucideIcon
	label: string
	value: string | number
	suffix?: string
	colors?: StatColorPalette
	// ideally this would not need to be passed in, but components package doesn't have access to theme info.
	// perhaps it should, or just fucking fold in the packages to browser package and be done with the whole thing
	isDark?: boolean
}

// yoinked from expo but didn't spend lots of time on color science etc, just a rough port to web

export function StatCard({ icon: Icon, label, value, suffix, colors, isDark }: StatCardProps) {
	const textColor = colors ? (isDark ? colors.secondary : colors.primary) : undefined
	const backgroundColor = colors
		? isDark
			? colors.primary + '80'
			: colors.secondary + 'c0'
		: undefined
	const iconBg = colors?.primary
	const iconColor = colors?.secondary

	return (
		<div
			className={cn('gap-2 p-3 flex flex-col rounded-2xl', !colors && 'bg-muted')}
			style={backgroundColor ? { backgroundColor } : undefined}
		>
			<div className="flex items-start justify-between">
				{Icon && (
					<div
						className="h-7 w-7 flex shrink-0 items-center justify-center rounded-lg"
						style={iconBg ? { backgroundColor: iconBg } : { backgroundColor: 'rgb(0 0 0 / 0.1)' }}
					>
						<Icon
							className={cn('h-4 w-4', !colors && 'text-muted-foreground')}
							style={iconColor ? { color: iconColor } : undefined}
						/>
					</div>
				)}
				<div className="gap-0.5 flex items-end">
					<span
						className={cn('text-2xl font-extrabold tabular-nums', !colors && 'text-foreground')}
						style={textColor ? { color: textColor } : undefined}
					>
						{value}
					</span>
					{suffix && (
						<span
							className={cn('mb-0.5 text-sm font-bold opacity-50', !colors && 'text-foreground')}
							style={textColor ? { color: textColor } : undefined}
						>
							{suffix}
						</span>
					)}
				</div>
			</div>
			<span
				className={cn('px-0.5 text-sm font-medium', !colors && 'text-foreground')}
				style={textColor ? { color: textColor } : undefined}
			>
				{label}
			</span>
		</div>
	)
}
