import { Button, Heading, Input, Text, TextArea } from '@stump/components'
import React from 'react'

import { ContentContainer, SceneContainer } from '@/components/container'

import { useSmartListContext } from '../context'
import AccessSettings from './AccessSettings'
import FilterConfiguration from './FilterConfiguration'

// TODO: split into components
// TODO: make werk
export default function UserSmartListSettingsScene() {
	const {
		list: { name, description },
	} = useSmartListContext()

	return (
		<SceneContainer>
			<ContentContainer className="mt-0">
				<div className="flex flex-col gap-y-6">
					<div>
						<Heading size="md">Basic details</Heading>
						<Text variant="muted" size="sm">
							Change the name, description, and other basic details for this smart list
						</Text>
					</div>

					<Input label="Name" variant="primary" value={name} />
					<TextArea
						label="Description"
						variant="primary"
						className="md:w-3/5"
						value={description || ''}
					/>

					<div>
						<Button variant="primary" disabled>
							Save changes
						</Button>
					</div>
				</div>

				<FilterConfiguration />
				<AccessSettings />
			</ContentContainer>
		</SceneContainer>
	)
}
