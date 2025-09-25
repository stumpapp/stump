import { Dropdown } from '@stump/components'
import { Clock } from 'lucide-react'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { useImageBaseReaderContext } from '../context'
import ControlButton from './ControlButton'

export default function TimerMenu() {
	const { book, resetTimer } = useImageBaseReaderContext()
	const {
		bookPreferences: { trackElapsedTime },
		setBookPreferences,
	} = useBookPreferences({ book })

	return (
		<Dropdown>
			<Dropdown.Trigger asChild>
				<ControlButton className="text-foreground-on-black">
					<Clock className="h-4 w-4" />
				</ControlButton>
			</Dropdown.Trigger>

			<Dropdown.Content align="end">
				<Dropdown.Item onClick={() => setBookPreferences({ trackElapsedTime: !trackElapsedTime })}>
					{trackElapsedTime ? 'Stop Timer' : 'Start Timer'}
				</Dropdown.Item>

				<Dropdown.Item onClick={resetTimer}>Reset Timer</Dropdown.Item>
			</Dropdown.Content>
		</Dropdown>
	)
}
