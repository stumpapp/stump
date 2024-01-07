import { NativeSelect } from '@stump/components'
import React from 'react'

export default function PersistedViewSelector() {
	return (
		<NativeSelect
			className="w-[185px]"
			options={[]}
			emptyOption={{ label: 'Default view', value: '' }}
		/>
	)
}
