import { cn, IconButton, ToolTip } from '@stump/components'
import { Settings } from 'lucide-react'
import React from 'react'
import { useLocation, useNavigate } from 'react-router'

import paths from '../../paths'

export default function SettingsButton() {
	const navigate = useNavigate()
	const location = useLocation()

	const isActive = location.pathname.startsWith(paths.settings())

	return (
		<ToolTip content="Go to settings" align="end">
			<IconButton
				variant="ghost"
				className={cn('p-1.5', { 'dark:bg-gray-900/70': isActive })}
				onClick={() => navigate(paths.settings())}
			>
				<Settings className="h-4 w-4 -scale-x-[1] transform" />
			</IconButton>
		</ToolTip>
	)
}
