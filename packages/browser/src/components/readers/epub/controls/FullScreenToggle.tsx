import { Fullscreen, Shrink } from 'lucide-react'

import { useEpubReaderControls } from '../context'
import ControlButton from './ControlButton'

export default function FullScreenToggle() {
	const { fullscreen, setFullscreen } = useEpubReaderControls()

	const Icon = fullscreen ? Shrink : Fullscreen
	return (
		<ControlButton
			title={fullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
			onClick={() => setFullscreen(!fullscreen)}
		>
			<Icon className="h-4 w-4" />
		</ControlButton>
	)
}
