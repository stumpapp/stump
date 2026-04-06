import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { Fragment } from 'react'

import { ControlsBackdrop } from '../shared'
import Footer from './Footer'
import Header from './Header'
import ImageReaderSettingsSheet from './ImageReaderSettingsSheet'

// TODO: support setting custom gradient colors

export default function ControlsOverlay() {
	return (
		<Fragment>
			<Header onShowGlobalSettings={() => TrueSheet.present('imageReaderSettings')} />

			<ControlsBackdrop />

			<ImageReaderSettingsSheet />

			<Footer />
		</Fragment>
	)
}
