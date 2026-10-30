import { useGraphQLMutation, useSDK } from '@stump/client'
import { graphql } from '@stump/graphql'
import { handleApiError } from '@stump/sdk'
import { useQueryClient } from '@tanstack/react-query'
import { Suspense, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { CreateSceneHeader } from '@/components/sharedLayout'
import { useTranslate } from '@/hooks/useTranslate'
import { usePaths } from '@/paths'

import { intoAPI, SmartListFormSchema } from '../../components/smartList/createOrUpdate/schema'
import CreateSmartListForm from './CreateSmartListForm'

const mutation = graphql(`
	mutation CreateSmartListScene($input: SaveSmartListInput!) {
		createSmartList(input: $input) {
			id
			name
		}
	}
`)

export default function CreateSmartListScene() {
	const paths = usePaths()
	const client = useQueryClient()
	const { sdk } = useSDK()
	const { t, translate } = useTranslate()
	const navigate = useNavigate()

	const {
		mutate: mutate,
		isPending: isCreating,
		error: error,
	} = useGraphQLMutation(mutation, {
		onSuccess: (data) => {
			navigate(paths.smartList(data.createSmartList.id))
			client.invalidateQueries({ queryKey: [sdk.cacheKeys.smartLists] })
			client.invalidateQueries({ queryKey: [sdk.cacheKeys.smartListNames] })
		},
	})
	const createError = useMemo(() => (error ? handleApiError(error) : undefined), [error])

	const handleSubmit = useCallback(
		(values: SmartListFormSchema) => {
			const payload = intoAPI(values)
			mutate({ input: payload })
		},
		[mutate],
	)

	useEffect(() => {
		if (createError) {
			toast.error(t('createSmartListScene.failedToCreateSmartList'), {
				description: createError,
			})
		}
	}, [createError, t])

	return (
		<div className="relative flex flex-1 flex-col">
			<CreateSceneHeader
				parent={{ label: translate('shared.common.smartLists'), to: paths.smartLists() }}
				title={t('sidebar.buttons.createSmartlist')}
			/>

			<Suspense>
				<CreateSmartListForm onSubmit={handleSubmit} isLoading={isCreating} />
			</Suspense>
		</div>
	)
}
