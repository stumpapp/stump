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

	const renderDoubleSpreadOption = () => {
		// TODO(readers): Support double spread for horizontal scrolling
		if (readingMode.startsWith('continuous')) {
			return null
		} else {
			return <DoubleSpreadToggle />
		}
	}

	const renderDirectionalOptions = () => {
		// TODO(readers): Support rtl reading direction for horizontal scrolling
		if (readingMode.startsWith('continuous')) {
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
				{renderDoubleSpreadOption()}
				<ReadingModeSelect />
				{renderDirectionalOptions()}
				<BrightnessControl />
			</Popover.Content>
		</Popover>
	)
}
