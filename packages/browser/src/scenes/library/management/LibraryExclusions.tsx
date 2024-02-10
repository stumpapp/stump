import { ComboBox, Heading, Text } from '@stump/components'
import React from 'react'

export default function LibraryExclusions() {
	return (
		<div className="flex flex-col gap-4">
			<div>
				<Heading size="sm">Excluded users</Heading>
				<Text size="sm" variant="muted" className="mt-1">
					These users will be excluded from accessing the library or any of its contents. Changes
					will take effect immediately
				</Text>
			</div>

			<ComboBox options={[]} />
		</div>
	)
}
