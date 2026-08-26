import { useGraphQLMutation, useSDK } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

const mutation = graphql(`
	mutation SetMediaKoboSync($mediaIds: [ID!]!, $isSelected: Boolean!) {
		setMediaKoboSync(mediaIds: $mediaIds, isSelected: $isSelected)
	}
`)

export default function useKoboSync() {
	const { sdk } = useSDK()
	const client = useQueryClient()

	return useGraphQLMutation(mutation, {
		onSuccess: () =>
			client.invalidateQueries({
				predicate: ({ queryKey }) =>
					queryKey.includes(sdk.cacheKeys.bookOverview) ||
					queryKey.includes(sdk.cacheKeys.libraryBooks) ||
					queryKey.includes(sdk.cacheKeys.seriesBooks) ||
					queryKey.includes('booksSearch'),
			}),
		onError: (error) => {
			console.error(error)
			toast.error('Failed to update Kobo sync selection')
		},
	})
}
