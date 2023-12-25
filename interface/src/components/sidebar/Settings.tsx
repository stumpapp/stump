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
				className={cn(
					'border border-transparent p-1.5 text-contrast',
					isActive
						? 'border-edge-200/50 bg-sidebar-200 hover:bg-sidebar-200'
						: 'hover:border-edge-200/50 hover:bg-sidebar-200/70',
				)}
				pressEffect={false}
				onClick={() => navigate(paths.settings())}
			>
				<Settings className="h-4 w-4 -scale-x-[1] transform" />
			</IconButton>
		</ToolTip>
	)
}
