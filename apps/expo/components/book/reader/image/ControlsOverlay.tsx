import { Fragment, useState } from 'react'

import { ControlsBackdrop } from '../shared'
import Footer from './Footer'
import Header from './Header'
import ImageReaderGlobalSettingsDialog from './ImageReaderGlobalSettingsDialog'

// TODO: support setting custom gradient colors

export default function ControlsOverlay() {
	const [showGlobalSettings, setShowGlobalSettings] = useState(false)

	return (
		<Fragment>
			<Header onShowGlobalSettings={() => setShowGlobalSettings(true)} />

			<ControlsBackdrop />

			<ImageReaderGlobalSettingsDialog
				isOpen={showGlobalSettings}
				onClose={() => setShowGlobalSettings(false)}
			/>

			<Footer />
		</Fragment>
	)
}
