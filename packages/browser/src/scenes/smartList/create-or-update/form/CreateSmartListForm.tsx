import { zodResolver } from '@hookform/resolvers/zod'
import { Form, Heading, Text } from '@stump/components'
import React from 'react'
import { useForm } from 'react-hook-form'

import { ContentContainer } from '@/components/container'

import { SmartListQueryBuilder } from '../queryBuilder'
import AccessSettings from './AccessSettings'
import BasicDetails from './BasicDetails'
import { schema, SmartListFormSchema } from './schema'

export default function CreateSmartListForm() {
	const form = useForm<SmartListFormSchema>({
		defaultValues: {
			filters: {
				groups: [
					{
						filters: [{ field: 'name', operation: 'any', source: 'book', value: ['boo', 'biz'] }],
						joiner: 'or',
					},
				],
				joiner: 'and',
			},
			visibility: 'PRIVATE',
		},
		resolver: zodResolver(schema),
	})

	const handleSubmit = async (data: SmartListFormSchema) => {
		console.debug('Create smart list', { data })
	}

	return (
		<Form form={form} onSubmit={handleSubmit}>
			<ContentContainer>
				<BasicDetails />

				<div className="flex flex-col gap-y-6">
					<div>
						<Heading size="md">Filter configuration</Heading>
						<Text variant="muted" size="sm">
							The filters, y&apos;know
						</Text>
					</div>
					<SmartListQueryBuilder />
				</div>

				<AccessSettings />
			</ContentContainer>
		</Form>
	)
}
