import { useLocaleContext } from '@stump/i18n'
import { Fullscreen } from 'lucide-react'

import { useEpubReaderControls } from '../context'
import ControlButton from './ControlButton'

export default function FullScreenToggle() {
	const { t } = useLocaleContext()
	const { fullscreen, setFullscreen } = useEpubReaderControls()

	return (
		<ControlButton title={t(`readerUi.fullscreen.${fullscreen ? 'exit' : 'enter'}`)}>
			<Fullscreen className="h-4 w-4" onClick={() => setFullscreen(!fullscreen)} />
		</ControlButton>
	)
}
