import { useEmailersQuery } from '@stump/client'
import React from 'react'

import { ContentContainer, SceneContainer } from '@/components/container'

import { CreateOrUpdateEmailerForm, FormValues } from './emailers'

export default function CreateEmailerScene() {
	const { emailers } = useEmailersQuery({
		suspense: true,
	})

	const onSubmit = (values: FormValues) => {
		console.debug(values)
	}

	return (
		<SceneContainer>
			<ContentContainer>
				<CreateOrUpdateEmailerForm
					existingNames={emailers?.map((e) => e.name) || []}
					onSubmit={onSubmit}
				/>
			</ContentContainer>
		</SceneContainer>
	)
}
