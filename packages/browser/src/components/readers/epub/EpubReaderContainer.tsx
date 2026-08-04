import { useEffect, useState } from 'react'

import { EpubReaderContext, EpubReaderControls, EpubReaderMeta } from './context'
import { EpubNavigationControls } from './controls'
import EpubReaderFooter from './EpubReaderFooter'
import EpubReaderHeader from './EpubReaderHeader'

type Props = {
	children: React.ReactNode
	readerMeta: EpubReaderMeta
	controls: Pick<
		EpubReaderControls,
		| 'onLinkClick'
		| 'onPaginateBackward'
		| 'onPaginateForward'
		| 'jumpToSection'
		| 'onGoToLocator'
		| 'getLocatorPreviewText'
		| 'searchBook'
		| 'canGoForward'
		| 'canGoBackward'
	>
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
			<div className="min-h-0 flex h-full w-full flex-col overflow-hidden">
				<EpubReaderHeader />
				<div className="min-h-0 relative w-full flex-1">
					<EpubNavigationControls>{children}</EpubNavigationControls>
				</div>
				<EpubReaderFooter />
			</div>
		</EpubReaderContext.Provider>
	)
}
