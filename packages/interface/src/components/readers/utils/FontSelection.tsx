import { IconButton, Popover, Text } from '@stump/components'
import { TextAa } from 'phosphor-react'

interface Props {
	changeFontSize(size: number): void
	fontSize: number
}

// FIXME: I briefly worked on this file to remove chakra, but it needs a LOT of work.
// it is very ugly. stinky doody code, too.

export default function FontSelection({ changeFontSize, fontSize }: Props) {
	return (
		<Popover>
			<Popover.Trigger>
				<IconButton variant="ghost">
					<TextAa className="text-lg" weight="regular" />
				</IconButton>
			</Popover.Trigger>
			<Popover.Content size="sm">
				<div className="flex flex-col gap-2">
					<Text className="text-center">{fontSize}px</Text>

					<div className="flex items-center justify-center gap-1">
						<IconButton
							onClick={() => changeFontSize(fontSize - 1)}
							variant="ghost"
							// fontSize="sm"
							title="Decrease font size"
						>
							A
						</IconButton>

						<IconButton
							onClick={() => changeFontSize(fontSize + 1)}
							variant="ghost"
							// fontSize="2xl"
							title="Increase font size"
						>
							A
						</IconButton>
					</div>
				</div>
			</Popover.Content>
		</Popover>
	)
}
