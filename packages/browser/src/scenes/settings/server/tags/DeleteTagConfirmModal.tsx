import { useGraphQLMutation, useSDK } from '@stump/client'
import { ConfirmationModal } from '@stump/components'
import { graphql, Tag } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { useTranslate } from '@/hooks/useTranslate'

const mutation = graphql(`
	mutation DeleteTagConfirmModal($tags: [String!]!) {
		deleteTags(tags: $tags) {
			id
			name
		}
	}
`)

type Props = {
	tag: Tag | null
	onClose: () => void
}

export default function DeleteTagConfirmModal({ tag, onClose }: Props) {
	const { sdk } = useSDK()
	const { t } = useTranslate()

	const client = useQueryClient()

	const { mutate: deleteTags, isPending } = useGraphQLMutation(mutation, {
		onSuccess: () => {
			client.refetchQueries({
				exact: false,
				predicate: ({ queryKey }) => queryKey.includes(sdk.cacheKeys.tags),
			})
			onClose()
		},
	})

	const handleConfirm = useCallback(() => {
		if (tag) {
			deleteTags({ tags: [tag.name] })
		}
	}, [tag, deleteTags])

	return (
		<ConfirmationModal
			title={t(getKey('title'))}
			description={t(getKey('description'))}
			confirmText={t(getKey('confirm'))}
			confirmVariant="destructive"
			isOpen={!!tag}
			onClose={onClose}
			onConfirm={handleConfirm}
			confirmIsLoading={isPending}
			trigger={null}
		/>
	)
}

const LOCALE_BASE = 'settingsScene.server/tags.sections.deleteTag'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
