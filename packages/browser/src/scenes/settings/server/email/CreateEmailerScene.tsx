import { useGraphQLMutation, useSDK, useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import omit from 'lodash/omit'
import { useEffect } from 'react'
import { useNavigate } from 'react-router'

import { ContentContainer, SceneContainer } from '@/components/container'
import paths from '@/paths'

import { useEmailerSettingsContext } from './context'
import { CreateOrUpdateEmailerForm, CreateOrUpdateEmailerSchema } from './emailers'

const query = graphql(`
	query CreateEmailerSceneEmailers {
		emailers {
			name
		}
	}
`)

const mutation = graphql(`
	mutation CreateEmailerSceneCreateEmailer($input: EmailerInput!) {
		createEmailer(input: $input) {
			id
		}
	}
`)

export default function CreateEmailerScene() {
	const navigate = useNavigate()
	const client = useQueryClient()

	const { sdk } = useSDK()

	const { canCreateEmailer } = useEmailerSettingsContext()
	const {
		data: { emailers },
	} = useSuspenseGraphQL(query, sdk.cacheKey('emailers', ['createEmailer']))

	const { mutate } = useGraphQLMutation(mutation, {
		onSuccess: async () => {
			await client.invalidateQueries({
				predicate: ({ queryKey: [baseKey] }) => baseKey === sdk.cacheKeys.emailers,
			})
			await navigate(paths.settings('email'))
		},
	})

	const onSubmit = ({ name, isPrimary, ...config }: CreateOrUpdateEmailerSchema) => {
		mutate({
			input: {
				isPrimary,
				name,
				config: {
					...omit(config, ['smtpHost', 'smtpPort']),
					host: config.smtpHost,
					port: config.smtpPort,
				},
			},
		})
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
					existingNames={emailers.map((e) => e.name) || []}
					onSubmit={onSubmit}
				/>
			</ContentContainer>
		</SceneContainer>
	)
}
