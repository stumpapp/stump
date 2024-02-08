import { Heading, Label, NativeSelect, Text } from '@stump/components'
import React from 'react'
import { useFormContext } from 'react-hook-form'
import { match } from 'ts-pattern'

import { Schema } from './schema'

type SubSchema = Pick<Schema, 'visibility'>

export default function AccessSettings() {
	const form = useFormContext<SubSchema>()

	const visibility = form.watch('visibility')

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
					Define the access settings for this smart list. Some options are made available once
					created in settings
				</Text>
			</div>

			<div className="flex max-w-xs flex-col gap-y-1.5">
				<Label>Visibility</Label>
				<NativeSelect
					options={[
						{ label: 'Public', value: 'PUBLIC' },
						{ label: 'Shared', value: 'SHARED' },
						{ label: 'Private', value: 'PRIVATE' },
					]}
					{...form.register('visibility')}
				/>
				<Text variant="muted" size="sm">
					{renderVisibilityHelp()}
				</Text>
			</div>
		</div>
	)
}
