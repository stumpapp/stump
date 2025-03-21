import { requireNativeView } from 'expo'
import * as React from 'react'

import { ReadiumViewProps } from './Readium.types'

const NativeView: React.ComponentType<ReadiumViewProps> = requireNativeView('Readium')

export default function ReadiumView(props: ReadiumViewProps) {
	return <NativeView {...props} />
}
