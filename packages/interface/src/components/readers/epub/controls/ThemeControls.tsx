import { Popover } from '@stump/components'
import { Paintbrush } from 'lucide-react'
import React from 'react'

import { ThemeSwitch } from '../../../sidebar'
import ControlButton from './ControlButton'
import FontSizeControl from './FontSizeControl'
import ReadingDirection from './ReadingDirection'

export default function ThemeControls() {
	return (
		<Popover>
			<Popover.Trigger asChild>
				<ControlButton title="Theme and options">
					<Paintbrush className="h-4 w-4" />
				</ControlButton>
			</Popover.Trigger>

			<Popover.Content
				size="sm"
				align="end"
				className="z-[101] flex flex-col gap-4 dark:border-gray-850 dark:bg-gray-1000"
			>
				<ThemeSwitch showIcon={false} activeOnHover={false} className="px-0" />
				<FontSizeControl />
				<ReadingDirection />
			</Popover.Content>
		</Popover>
	)
}
