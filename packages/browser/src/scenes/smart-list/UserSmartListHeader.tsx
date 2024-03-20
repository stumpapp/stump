import { cn, Heading, Link, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import React from 'react'

import { usePreferences } from '@/hooks'
import paths from '@/paths'

import { useSmartListContext } from './context'
import { parseListMeta } from './utils'

const LOCALE_BASE_KEY = 'userSmartListScene.header'
const withLocaleKey = (key: string) => `${LOCALE_BASE_KEY}.${key}`

export default function UserSmartListHeader() {
	const { t } = useLocaleContext()
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
				<Link
					to={paths.smartLists()}
					variant="muted"
					className="text-sm no-underline hover:underline"
				>
					{t(withLocaleKey('backLink'))} /
				</Link>
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
