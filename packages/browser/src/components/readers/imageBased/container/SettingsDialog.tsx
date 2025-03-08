import { Dialog, Heading } from '@stump/components'
import { Settings2 } from 'lucide-react'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { useImageBaseReaderContext } from '../context'
import BrightnessControl from './BrightnessControl'
import ControlButton from './ControlButton'
import DoubleSpreadToggle from './DoubleSpreadToggle'
import ImageScalingSelect from './ImageScalingSelect'
import ReadingDirectionSelect from './ReadingDirectionSelect'
import ReadingModeSelect from './ReadingModeSelect'

export default function SettingsDialog() {
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
		<Dialog>
			<Dialog.Trigger asChild>
				<ControlButton>
					<Settings2 className="h-4 w-4" />
				</ControlButton>
			</Dialog.Trigger>

			<Dialog.Content size="md" className="z-[101] flex flex-col gap-4 bg-background-surface">
				<Heading size="md">Settings</Heading>

				<ImageScalingSelect />
				{renderDoubleSpreadOption()}
				<ReadingModeSelect />
				{renderDirectionalOptions()}
				<BrightnessControl />
			</Dialog.Content>
		</Dialog>
	)
}
