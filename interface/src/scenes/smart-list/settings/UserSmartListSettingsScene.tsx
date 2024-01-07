import { Accordion, Button, Heading, Input, Label, Text, TextArea } from '@stump/components'
import React from 'react'

import { ContentContainer, SceneContainer } from '@/components/container'

import { useSmartListContext } from '../context'

// TODO: split into components
// TODO: make werk
export default function UserSmartListSettingsScene() {
	const {
		list: { name, description, filters },
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

				<div className="flex flex-col gap-y-6">
					<div>
						<Heading size="md">Configuration</Heading>
						<Text variant="muted" size="sm">
							Change the filters, sorting, and other settings for this smart list
						</Text>
					</div>

					<Accordion type="single" collapsible>
						<Accordion.Item value="raw_filters" className="border-none">
							<Accordion.Trigger noUnderline asLabel>
								Raw filters
							</Accordion.Trigger>
							<Accordion.Content className="rounded-sm bg-background-200 p-4">
								<pre className="text-xs text-contrast-200">{JSON.stringify(filters, null, 2)}</pre>
							</Accordion.Content>
						</Accordion.Item>
					</Accordion>
				</div>

				<div className="flex flex-col gap-y-6">
					<div>
						<Heading size="md">Access</Heading>
						<Text variant="muted" size="sm">
							Share or unshare this smart list with other users
						</Text>
					</div>

					<div>
						<Label>Granted users</Label>
						<div>TODO: form here?</div>
					</div>
				</div>
			</ContentContainer>
		</SceneContainer>
	)
}
