import { Fullscreen } from 'lucide-react'
import React from 'react'

import { useEpubReaderControls } from '../context'
import ControlButton from './ControlButton'

export default function FullScreenToggle() {
	const { fullscreen, setFullscreen } = useEpubReaderControls()

	return (
		<ControlButton
			title={fullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
			aria-about="When fullscreen is enabled, the top and bottom control menus are hidden unless your mouse is hovering over them"
		>
			<Fullscreen className="h-4 w-4" onClick={() => setFullscreen(!fullscreen)} />
		</ControlButton>
	)
}
