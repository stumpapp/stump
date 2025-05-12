import { Dialog, Heading, Popover } from '@stump/components'
import { Paintbrush } from 'lucide-react'

import ControlButton from './ControlButton'
import FontFamily from './FontFamily'
import FontSizeControl from './FontSizeControl'
import LineHeightControl from './LineHeightControl'
import ReadingDirection from './ReadingDirection'

export default function ThemeControls() {
	return (
		<Dialog>
			<Dialog.Trigger asChild>
				<ControlButton title="Theme and options">
					<Paintbrush className="h-4 w-4" />
				</ControlButton>
			</Dialog.Trigger>

			<Dialog.Content size="md" className="z-[101] flex flex-col gap-4 bg-background-surface">
				<Heading size="md">Appearance</Heading>

				<FontFamily />
				<FontSizeControl />
				<LineHeightControl />
				<ReadingDirection />
			</Dialog.Content>
		</Dialog>
	)

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
				className="z-[101] flex flex-col gap-4 bg-background-surface"
			>
				<FontSizeControl />
				<LineHeightControl />
				<ReadingDirection />
			</Popover.Content>
		</Popover>
	)
}
