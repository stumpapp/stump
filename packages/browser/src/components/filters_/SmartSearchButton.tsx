import { IconButton, ToolTip } from '@stump/components'
import { MediaMetadataOrderBy, MediaOrderBy, MediaSmartFilter } from '@stump/sdk'
import { WandSparkles } from 'lucide-react'
import React from 'react'

export default function SmartSearchButton() {
	return (
		<ToolTip content="Enable smart search" size="sm" side="left">
			<IconButton
				variant="ghost"
				size="xs"
				className="bg-fill-brand-secondary text-fill-brand"
				pressEffect={false}
			>
				<WandSparkles className="h-4 w-4 " />
			</IconButton>
		</ToolTip>
	)
}
