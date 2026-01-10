import { useGraphQLMutation, useSDK, useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import omit from 'lodash/omit'
import { useCallback, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router'

import { ContentContainer, SceneContainer } from '@/components/container'
import paths from '@/paths'

import { useEmailerSettingsContext } from './context'
import { CreateOrUpdateEmailerForm, CreateOrUpdateEmailerSchema } from './emailers'

const query = graphql(`
	query EditEmailerScene($id: Int!) {
		emailers {
			name
		}
		emailerById(id: $id) {
			id
			name
			isPrimary
			smtpHost
			smtpPort
			lastUsedAt
			maxAttachmentSizeBytes
			senderDisplayName
			senderEmail
			tlsEnabled
			username
		}
	}
`)

const mutation = graphql(`
	mutation EditEmailerSceneEditEmailer($id: Int!, $input: EmailerInput!) {
		updateEmailer(id: $id, input: $input) {
			id
		}
	}
`)

export default function EditEmailerScene() {
	const navigate = useNavigate()
	const client = useQueryClient()

	const { sdk } = useSDK()
	const { id: rawId } = useParams<{ id: string }>()

	const id = useMemo(() => parseInt(rawId || '', 10), [rawId])

	const { canEditEmailer } = useEmailerSettingsContext()
	const {
		data: { emailers, emailerById: emailer },
	} = useSuspenseGraphQL(query, sdk.cacheKey('emailers', ['editEmailer', id]), {
		id,
	})

	const existingNames = useMemo(() => emailers.map((e) => e.name), [emailers])

	const { mutate } = useGraphQLMutation(mutation, {
		onSuccess: async () => {
			await client.refetchQueries({
				predicate: ({ queryKey: [baseKey] }) => baseKey === sdk.cacheKeys.emailers,
			})
			navigate(paths.settings('email'))
		},
		onError: (error) => {
			console.error(error)
		},
	})

	useEffect(() => {
		if (isNaN(id) || !emailer) {
			navigate(paths.notFound())
		} else if (!canEditEmailer) {
			navigate('..', { replace: true })
		}
	}, [id, emailer, navigate, canEditEmailer])

	const onSubmit = useCallback(
		({ name, isPrimary, ...config }: CreateOrUpdateEmailerSchema) => {
			if (emailer?.id) {
				mutate({
					id: emailer.id,
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
		},
		[emailer, mutate],
	)

	if (!emailer || !canEditEmailer) {
		return null
	}

	return (
		<SceneContainer>
			<ContentContainer>
				<CreateOrUpdateEmailerForm
					emailer={emailer}
					existingNames={existingNames}
					onSubmit={onSubmit}
				/>
			</ContentContainer>
		</SceneContainer>
	)
}
