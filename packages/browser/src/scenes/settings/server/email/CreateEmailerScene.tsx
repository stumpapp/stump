import { useEmailersQuery, useMutation, useSDK } from '@stump/client'
import { CreateOrUpdateEmailer } from '@stump/sdk'
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router'

import { ContentContainer, SceneContainer } from '@/components/container'
import paths from '@/paths'

import { useEmailerSettingsContext } from './context'
import { CreateOrUpdateEmailerForm, CreateOrUpdateEmailerSchema } from './emailers'

export default function CreateEmailerScene() {
	const { sdk } = useSDK()
	const navigate = useNavigate()

	const { canCreateEmailer } = useEmailerSettingsContext()
	const { emailers } = useEmailersQuery({
		suspense: true,
	})
	const { mutateAsync: createEmailer } = useMutation(
		[sdk.emailer.keys.create],
		(params: CreateOrUpdateEmailer) => sdk.emailer.create(params),
	)

	const onSubmit = async ({ name, is_primary, ...config }: CreateOrUpdateEmailerSchema) => {
		try {
			await createEmailer({
				// @ts-expect-error: FIXME: fixme
				config: {
					...config,
					host: config.smtp_host,
					max_num_attachments: null,
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

	useEffect(() => {
		if (!canCreateEmailer) {
			navigate('..', { replace: true })
		}
	}, [canCreateEmailer, navigate])

	if (!canCreateEmailer) {
		return null
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
