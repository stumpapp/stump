import { cn, Heading, Text } from '@stump/components'
import React from 'react'

import { usePreferences } from '@/hooks'

export default function CreateSmartListHeader() {
	const {
		preferences: { primary_navigation_mode, layout_max_width_px },
	} = usePreferences()

	const preferTopBar = primary_navigation_mode === 'TOPBAR'

	return (
		<header
			className={cn('flex h-24 w-full flex-col gap-y-4 p-4', {
				'mx-auto': preferTopBar && !!layout_max_width_px,
			})}
			style={{
				maxWidth: preferTopBar ? layout_max_width_px || undefined : undefined,
			}}
		>
			<div>
				<Heading size="lg" bold>
					Create smart list
				</Heading>
				<Text size="md" variant="muted">
					A smart list allows for on-the-fly list creation based on a set of filters
				</Text>
			</div>
		</header>
	)
}
