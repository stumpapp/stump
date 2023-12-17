import { Fullscreen } from 'lucide-react'
import React from 'react'

import { useEpubReaderControls } from '../context'
import ControlButton from './ControlButton'

export default function FullScreenToggle() {
	const { fullscreen, setFullscreen } = useEpubReaderControls()

	return (
		<ControlButton>
			<Fullscreen className="h-4 w-4" onClick={() => setFullscreen(!fullscreen)} />
		</ControlButton>
	)
}
