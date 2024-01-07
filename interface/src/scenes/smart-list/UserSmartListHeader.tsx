import { usePreferences } from '@stump/client'
import { cn, Heading, Text } from '@stump/components'
import React from 'react'

import { useSmartListContext } from './context'
import { parseListMeta } from './utils'

export default function UserSmartListHeader() {
	const {
		preferences: { primary_navigation_mode, layout_max_width_px },
	} = usePreferences()
	const {
		list: { name, description },
		meta,
	} = useSmartListContext()

	const renderMeta = () => {
		if (!meta) {
			return null
		}

		const { figureString } = parseListMeta(meta) ?? {}
		if (!figureString) {
			return null
		}

		return (
			<Text size="sm" variant="muted">
				{figureString}
			</Text>
		)
	}

	const preferTopBar = primary_navigation_mode === 'TOPBAR'

	return (
		<header
			className={cn('flex w-full flex-col gap-y-4 p-4', {
				'mx-auto': preferTopBar && !!layout_max_width_px,
			})}
			style={{
				maxWidth: preferTopBar ? layout_max_width_px || undefined : undefined,
			}}
		>
			<div>
				<Heading size="lg" bold>
					{name}
				</Heading>
				<Text size="md" variant="muted">
					{description}
				</Text>
			</div>
			{renderMeta()}
		</header>
	)
}
