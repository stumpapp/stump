import { Popover } from '@stump/components'
import { Paintbrush } from 'lucide-react'
import React from 'react'

import { ThemeSwitch } from '../../../sidebar'
import ControlButton from './ControlButton'
import FontSizeControl from './FontSizeControl'

export default function ThemeControls() {
	return (
		<Popover>
			<Popover.Trigger>
				<ControlButton>
					<Paintbrush className="h-4 w-4" />
				</ControlButton>
			</Popover.Trigger>

			<Popover.Content
				size="sm"
				align="end"
				className="flex flex-col gap-4 dark:border-gray-850 dark:bg-gray-975/20"
			>
				<ThemeSwitch showIcon={false} activeOnHover={false} className="px-0" />
				<FontSizeControl />
			</Popover.Content>
		</Popover>
	)
}
