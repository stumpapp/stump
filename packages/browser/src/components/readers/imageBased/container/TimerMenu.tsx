import { Dropdown } from '@stump/components'
import { Clock } from 'lucide-react'

import { useTranslate } from '@/hooks/useTranslate'
import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { useImageBaseReaderContext } from '../context'
import ControlButton from './ControlButton'

export default function TimerMenu() {
	const { translate } = useTranslate()
	const { book, timer } = useImageBaseReaderContext()
	const {
		bookPreferences: { trackElapsedTime },
		setBookPreferences,
	} = useBookPreferences({ book })

	return (
		<Dropdown>
			<Dropdown.Trigger asChild>
				<ControlButton className="text-foreground">
					<Clock className="h-4 w-4" />
				</ControlButton>
			</Dropdown.Trigger>

			<Dropdown.Content align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
				<Dropdown.Item onClick={() => setBookPreferences({ trackElapsedTime: !trackElapsedTime })}>
					{trackElapsedTime
						? translate('shared.imageReader.timerMenu.stop')
						: translate('shared.imageReader.timerMenu.start')}
				</Dropdown.Item>

				<Dropdown.Item onClick={timer.reset}>
					{translate('shared.readerSettings.readingTimer.resetTimer')}
				</Dropdown.Item>
			</Dropdown.Content>
		</Dropdown>
	)
}
