import { requireNativeView } from 'expo'
import * as React from 'react'

import { ReadiumViewProps, ReadiumViewRef } from './Readium.types'

const NativeView: React.ComponentType<
	React.PropsWithoutRef<ReadiumViewProps> & React.RefAttributes<ReadiumViewRef>
> = requireNativeView('Readium')

const ReadiumView = React.forwardRef<ReadiumViewRef, ReadiumViewProps>((props, ref) => {
	return <NativeView ref={ref} {...props} />
})

ReadiumView.displayName = 'ReadiumView'

export default ReadiumView
