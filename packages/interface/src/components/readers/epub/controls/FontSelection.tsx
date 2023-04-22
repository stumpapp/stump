import { useEpubReader } from '@stump/client'
import { IconButton, Popover, Text } from '@stump/components'
import { CaseSensitive } from 'lucide-react'

// FIXME: I briefly worked on this file to remove chakra, but it needs a LOT of work.
// it is very ugly. stinky doody code, too.

export default function FontSelection() {
	const { fontSize, setFontSize } = useEpubReader((state) => ({
		fontSize: state.preferences.fontSize,
		setFontSize: state.setFontSize,
	}))

	return (
		<Popover>
			<Popover.Trigger>
				<IconButton variant="ghost" size="xs">
					<CaseSensitive className="h-5 w-5" />
				</IconButton>
			</Popover.Trigger>
			<Popover.Content size="sm">
				<div className="flex flex-col gap-2">
					<Text className="text-center">{fontSize}px</Text>

					<div className="flex items-center justify-center gap-1">
						<IconButton
							onClick={() => setFontSize(fontSize - 1)}
							variant="ghost"
							// fontSize="sm"
							title="Decrease font size"
						>
							A
						</IconButton>

						<IconButton
							onClick={() => setFontSize(fontSize + 1)}
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
