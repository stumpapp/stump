import { emailerApi } from '@stump/api'
import { useEmailersQuery, useMutation } from '@stump/client'
import React from 'react'
import { useNavigate } from 'react-router'

import { ContentContainer, SceneContainer } from '@/components/container'
import paths from '@/paths'

import { CreateOrUpdateEmailerForm, FormValues } from './emailers'

export default function CreateEmailerScene() {
	const navigate = useNavigate()

	const { emailers } = useEmailersQuery({
		suspense: true,
	})
	const { mutateAsync: createEmailer } = useMutation(['createEmailer'], emailerApi.createEmailer)

	const onSubmit = async ({ name, is_primary, ...config }: FormValues) => {
		try {
			await createEmailer({
				config: {
					...config,
					host: config.smtp_host,
					port: config.smtp_port,
				},
				is_primary,
				name,
			})
			navigate(paths.settings('server/email'))
		} catch (error) {
			console.error(error)
			// TODO:toast
		}
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
