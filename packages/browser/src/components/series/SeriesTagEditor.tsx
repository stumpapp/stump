import { useGraphQLMutation, useSDK } from '@stump/client'
import { Heading, Text } from '@stump/components'
import { graphql, Tag } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { toast } from 'sonner'

import TagSelect, { TagOption } from '@/components/TagSelect'

const mutation = graphql(`
	mutation SeriesTagEditorSetTags($id: ID!, $tags: [String!]!) {
		setSeriesTags(id: $id, tags: $tags) {
			id
			tags {
				id
				name
			}
		}
	}
`)

type Props = {
	seriesId: string
	tags: Tag[]
}

export default function SeriesTagEditor({ seriesId, tags }: Props) {
	const { sdk } = useSDK()
	const client = useQueryClient()

	const { mutate: setSeriesTags } = useGraphQLMutation(mutation, {
		onSuccess: () => {
			client.refetchQueries({
				exact: false,
				predicate: ({ queryKey }) =>
					queryKey.includes(sdk.cacheKeys.seriesById) || queryKey.includes(sdk.cacheKeys.tags),
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
			setSeriesTags({
				id: seriesId,
				tags: (newSelected ?? []).map((t) => t.label),
			})
		},
		[seriesId, setSeriesTags],
	)

	return (
		<div className="gap-y-2 flex flex-col">
			<div>
				<Heading size="sm">Tags</Heading>
				<Text size="sm" variant="muted">
					Assign tags to this series
				</Text>
			</div>

			<div className="max-w-sm">
				<TagSelect label="" selected={selected} onChange={handleChange} />
			</div>
		</div>
	)
}
