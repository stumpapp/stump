import { useEffect, useState } from 'react'

import { EpubReaderContext, EpubReaderControls, EpubReaderMeta } from './context'
import { FooterControls, HeaderControls } from './controls'
import EpubNavigationControls from './controls/EpubNavigationControls'

type Props = {
	children: React.ReactNode
	readerMeta: EpubReaderMeta
	controls: Pick<EpubReaderControls, 'onLinkClick' | 'onPaginateBackward' | 'onPaginateForward'>
}

/**
 * A container component that provides the basic functionality for epub readers.
 */
export default function EpubReaderContainer({ children, readerMeta, controls }: Props) {
	const [fullscreen, setFullscreen] = useState(false)
	const [controlsVisible, setControlsVisible] = useState(false)
	const [mouseIsInZone, setMouseIsInZone] = useState(false)

	const onMouseEnterControls = () => setMouseIsInZone(true)
	const onMouseLeaveControls = () => setMouseIsInZone(false)

	/**
	 * This effect is responsible for hiding the controls when the user is not interacting with the reader.
	 * It is 'debounced' to prevent the controls closing when the user exits but re-enters before
	 * the timeout has expired.
	 */
	useEffect(() => {
		if (!mouseIsInZone) {
			const timeout = setTimeout(() => {
				if (!mouseIsInZone) {
					setControlsVisible(false)
				}
			}, 2000)

			return () => clearTimeout(timeout)
		} else {
			setControlsVisible(true)
		}

		return undefined
	}, [mouseIsInZone])

	// FIXME: I don't like how the controls obstruct the view if I am being honest. redesign!
	return (
		<EpubReaderContext.Provider
			value={{
				controls: {
					...controls,
					fullscreen,
					onMouseEnterControls,
					onMouseLeaveControls,
					setFullscreen,
					setVisible: setControlsVisible,
					visible: controlsVisible,
				},
				readerMeta,
			}}
		>
			<HeaderControls />
			<EpubNavigationControls>{children}</EpubNavigationControls>
			<FooterControls />
		</EpubReaderContext.Provider>
	)
}
