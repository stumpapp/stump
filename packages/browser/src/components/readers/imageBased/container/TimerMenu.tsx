import { Dropdown } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Clock } from 'lucide-react'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { useImageBaseReaderContext } from '../context'
import ControlButton from './ControlButton'

export default function TimerMenu() {
	const { t } = useLocaleContext()
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
					{trackElapsedTime ? t('readerUi.timer.stop') : t('readerUi.timer.start')}
				</Dropdown.Item>

				<Dropdown.Item onClick={timer.reset}>{t('readerUi.timer.reset')}</Dropdown.Item>
			</Dropdown.Content>
		</Dropdown>
	)
}
