import { Popover, ToolTip } from '@stump/components'
import { Settings2 } from 'lucide-react'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { useImageBaseReaderContext } from '../context'
import BrightnessControl from './BrightnessControl'
import ControlButton from './ControlButton'
import DoubleSpreadToggle from './DoubleSpreadToggle'
import ImageScalingSelect from './ImageScalingSelect'
import ReadingDirectionSelect from './ReadingDirectionSelect'
import ReadingModeSelect from './ReadingModeSelect'

export default function LayoutMenu() {
	const { book } = useImageBaseReaderContext()
	const {
		bookPreferences: { readingMode },
	} = useBookPreferences({ book })

	const renderDirectionalOptions = () => {
		if (readingMode === 'continuous:vertical') {
			return null
		} else {
			return <ReadingDirectionSelect />
		}
	}

	return (
		<Popover>
			<ToolTip content="Layout preference" align="end">
				<Popover.Trigger asChild data-testid="trigger">
					<ControlButton>
						<Settings2 className="h-4 w-4" />
					</ControlButton>
				</Popover.Trigger>
			</ToolTip>

			<Popover.Content
				size="lg"
				align="end"
				className="z-[101] flex flex-col gap-1.5 bg-background-surface"
			>
				<ImageScalingSelect />
				<DoubleSpreadToggle />
				<ReadingModeSelect />
				{renderDirectionalOptions()}
				<BrightnessControl />
			</Popover.Content>
		</Popover>
	)
}
