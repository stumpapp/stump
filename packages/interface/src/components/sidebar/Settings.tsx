import { IconButton, ToolTip } from '@stump/components'
import { Settings } from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router'

import paths from '../../paths'

export default function SettingsButton() {
	const navigate = useNavigate()
	return (
		<ToolTip content="Go to settings">
			<IconButton variant="ghost" className="p-1.5" onClick={() => navigate(paths.settings())}>
				<Settings className="h-4 w-4 -scale-x-[1] transform" />
			</IconButton>
		</ToolTip>
	)
}
