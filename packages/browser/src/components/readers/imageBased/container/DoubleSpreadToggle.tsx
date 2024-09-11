import { CheckBox } from '@stump/components'
import React from 'react'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { useImageBaseReaderContext } from '../context'

export default function DoubleSpreadToggle() {
	const { book } = useImageBaseReaderContext()
	const {
		bookPreferences: { doubleSpread },
		setBookPreferences,
	} = useBookPreferences({ book })

	return (
		<CheckBox
			id="double-spread"
			label="Double spread"
			description="Display two pages at once"
			checked={doubleSpread}
			onClick={() => setBookPreferences({ doubleSpread: !doubleSpread })}
			variant="primary"
		/>
	)
}
