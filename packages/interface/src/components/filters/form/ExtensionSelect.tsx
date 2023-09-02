import { Label, NativeSelect } from '@stump/components'
import React from 'react'
import { useFormContext } from 'react-hook-form'

export default function ExtensionSelect() {
	const form = useFormContext()

	return (
		<div className="py-1.5">
			<Label htmlFor="extension" className="mb-1.5">
				Extension
			</Label>
			<NativeSelect
				options={[
					{ label: 'Any', value: '' },
					{ label: 'CBZ', value: 'cbz' },
					{ label: 'CBR', value: 'cbr' },
					{ label: 'ZIP', value: 'zip' },
					{ label: 'RAR', value: 'rar' },
					{ label: 'EPUB', value: 'epub' },
					{ label: 'PDF', value: 'pdf' },
				]}
				{...form.register('extension')}
			/>
		</div>
	)
}
