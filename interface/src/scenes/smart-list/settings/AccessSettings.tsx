import { Heading, Label, NativeSelect, Text } from '@stump/components'
import { EntityVisibility } from '@stump/types'
import React, { useCallback } from 'react'
import { match } from 'ts-pattern'

import { useSmartListContext } from '../context'

export default function AccessSettings() {
	const {
		list: { visibility },
		patchSmartList,
	} = useSmartListContext()

	const handleVisibilityChange = useCallback(
		(value: EntityVisibility) => patchSmartList({ visibility: value }),
		[patchSmartList],
	)

	const renderVisibilityHelp = () =>
		match(visibility)
			.with('PUBLIC', () => 'This smart list is visible to everyone')
			.with('SHARED', () => 'This smart list is visible to anyone you explicitly share it with')
			.with('PRIVATE', () => 'This smart list is only visible to you')
			.exhaustive()

	return (
		<div className="flex flex-col gap-y-6">
			<div>
				<Heading size="md">Access</Heading>
				<Text variant="muted" size="sm">
					Share or unshare this smart list with other users
				</Text>
			</div>

			<div
				className="flex max-w-xs cursor-not-allowed flex-col gap-y-1.5"
				title="This feature is not implemented yet!"
			>
				<Label className="text-opacity-50">Visibility</Label>
				<NativeSelect
					options={[
						{ label: 'Public', value: 'PUBLIC' },
						{ label: 'Shared', value: 'SHARED' },
						{ label: 'Private', value: 'PRIVATE' },
					]}
					value={visibility}
					onChange={(e) => handleVisibilityChange(e.target.value as EntityVisibility)}
					disabled
				/>
				<Text variant="muted" size="sm" className="text-opacity-50">
					{renderVisibilityHelp()}
				</Text>
			</div>
		</div>
	)
}
