import { cn, IconButton, ToolTip } from '@stump/components'
import { Settings } from 'lucide-react'
import React from 'react'
import { useLocation, useNavigate } from 'react-router'

import paths from '../../../paths'

export default function SettingsButton() {
	const navigate = useNavigate()
	const location = useLocation()

	const isActive = location.pathname.startsWith(paths.settings())

	return (
		<ToolTip content="Go to settings" align="end">
			<IconButton
				variant="ghost"
				className={cn(
					'border border-transparent p-1.5 text-foreground',
					isActive
						? 'border-edge-subtle/50 bg-sidebar-surface hover:bg-sidebar-surface'
						: 'hover:border-edge-subtle/50 hover:bg-sidebar-surface/70',
				)}
				pressEffect={false}
				onClick={() => navigate(paths.settings())}
			>
				<Settings className="h-4 w-4 -scale-x-[1] transform" />
			</IconButton>
		</ToolTip>
	)
}
