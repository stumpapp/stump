import { Fragment, PropsWithChildren } from 'react'

import ControlsOverlay from './ControlsOverlay'

const ReaderContainer = ({ children }: PropsWithChildren) => {
	return (
		<Fragment>
			<ControlsOverlay />
			{children}
		</Fragment>
	)
}

export default ReaderContainer
