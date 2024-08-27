import { cn, Heading, Text } from '@stump/components'
import React from 'react'

import { usePreferences } from '@/hooks/usePreferences'

export default function LibrarySettingsHeader() {
	const {
		preferences: { primary_navigation_mode, layout_max_width_px },
	} = usePreferences()

	const preferTopBar = primary_navigation_mode === 'TOPBAR'

	return (
		<header
			className={cn(
				'flex w-full flex-col gap-4 border-b border-b-edge p-4 pl-52 md:flex-row md:items-start md:justify-between md:gap-0',
				{
					'mx-auto': preferTopBar && !!layout_max_width_px,
				},
			)}
			style={{
				maxWidth: preferTopBar ? layout_max_width_px || undefined : undefined,
			}}
		>
			<div className="flex w-full flex-col items-center gap-2 md:mb-2 md:items-start">
				<Heading size="lg">Section Heading</Heading>

				<Text size="sm" variant="muted">
					Section description
				</Text>
			</div>
		</header>
	)
}
