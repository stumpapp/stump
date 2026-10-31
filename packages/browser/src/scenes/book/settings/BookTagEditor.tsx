import { useGraphQLMutation, useSDK } from '@stump/client'
import { Heading, Text } from '@stump/components'
import { graphql, Tag } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { toast } from 'sonner'

import TagSelect, { TagOption } from '@/components/TagSelect'
import { useTranslate } from '@/hooks/useTranslate'

// TODO(ui): i dislike the current ui for editing tags in general, there's gotta be something better than a
// combo box. spacedrive did a sort of grid but that doesn't quite scale either ig

const mutation = graphql(`
	mutation BookTagEditorSetTags($id: ID!, $tags: [String!]!) {
		setMediaTags(id: $id, tags: $tags) {
			id
			tags {
				id
				name
			}
		}
	}
`)

type Props = {
	mediaId: string
	tags: Tag[]
}

export default function BookTagEditor({ mediaId, tags }: Props) {
	const { t } = useTranslate()
	const { sdk } = useSDK()
	const client = useQueryClient()

	const { mutate: setMediaTags } = useGraphQLMutation(mutation, {
		onSuccess: () => {
			client.refetchQueries({
				exact: false,
				predicate: ({ queryKey }) =>
					queryKey.includes(sdk.cacheKeys.bookOverview) ||
					queryKey.includes(sdk.cacheKeys.mediaById) ||
					queryKey.includes(sdk.cacheKeys.tags),
			})
		},
		onError: (error) => {
			console.error('Failed to update tags', error)
			toast.error(String(error))
		},
	})

	const selected: TagOption[] = tags.map((tag) => ({
		label: tag.name,
		value: tag.name.toLowerCase(),
	}))

	const handleChange = useCallback(
		(newSelected?: TagOption[]) => {
			setMediaTags({
				id: mediaId,
				tags: (newSelected ?? []).map((t) => t.label),
			})
		},
		[mediaId, setMediaTags],
	)

	return (
		<div className="gap-y-2 flex flex-col">
			<div>
				<Heading size="sm">{t('common.tags')}</Heading>
				<Text size="sm" variant="muted">
					{t('bookManagementScene.tagsDescription')}
				</Text>
			</div>

			<div className="max-w-sm">
				<TagSelect label="" selected={selected} onChange={handleChange} />
			</div>
		</div>
	)
}
