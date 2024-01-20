import { Alert, Form, Link } from '@stump/components'
import { Construction } from 'lucide-react'
import React from 'react'
import { useForm, UseFormReturn } from 'react-hook-form'

import { ContentContainer } from '@/components/container'

import AccessSettings from './AccessSettings'
import BasicDetails from './BasicDetails'
import FilterConfiguration from './FilterConfiguration'
import { Schema } from './schema'

const IS_DEVELOPMENT = import.meta.env.DEV

// TODO: share these form components with the update/settings!!!!!!!!!!!!
export default function CreateSmartListForm() {
	const form = useForm<Schema>({
		defaultValues: {
			filters: {
				groups: [
					{
						filters: [
							// {
							// 	name: 'test-1',
							// },
							// {
							// 	name: 'test-2',
							// },
						],
						joiner: 'and',
					},
				],
				joiner: 'AND',
			},
			visibility: 'PRIVATE',
		},
	})

	const handleSubmit = async (data: Schema) => {
		console.debug('Create smart list', { data })
	}

	return (
		<>
			<Alert level="warning" icon={Construction} rounded="sm">
				<Alert.Content>
					<span>
						Smart list creation is not yet implemented on the UI. To learn how you can use the API
						to create a smart list, visit the{' '}
						<Link href="https://stumpapp.dev/guides/smart-lists">docs</Link>
					</span>
				</Alert.Content>
			</Alert>
			<Form form={form} onSubmit={handleSubmit}>
				<ContentContainer>
					<BasicDetails />
					{IS_DEVELOPMENT && <FilterConfiguration />}
					<AccessSettings />
				</ContentContainer>
			</Form>
		</>
	)
}

export type CreateSmartListForm = UseFormReturn<Schema>
