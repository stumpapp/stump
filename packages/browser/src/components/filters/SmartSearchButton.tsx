import { IconButton, ToolTip } from '@stump/components'
import { WandSparkles } from 'lucide-react'

export default function SmartSearchButton() {
	return (
		<ToolTip content="Enable smart search" size="sm" side="left">
			<IconButton
				variant="ghost"
				size="xs"
				className="bg-fill-brand-secondary text-fill-brand"
				pressEffect={false}
			>
				<WandSparkles className="h-4 w-4" />
			</IconButton>
		</ToolTip>
	)
}
