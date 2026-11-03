import { useGraphQLMutation } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'

import { useSyncOnlineToOfflineAnnotations } from '~/lib/hooks'
import { useActiveServer } from '~/providers/ActiveServerProvider'

const updateAnnotationMutation = graphql(`
	mutation UpdateAnnotationMobileEventTimeline($input: UpdateAnnotationInput!) {
		updateAnnotation(input: $input) {
			id
			annotationText
			updatedAt
		}
	}
`)

const deleteAnnotationMutation = graphql(`
	mutation DeleteAnnotationMobileEventTimeline($id: String!) {
		deleteAnnotation(id: $id) {
			id
		}
	}
`)

type Params = {
	session: {
		id: number
		mediaId: string
	}
}

export function useEventMutations({ session }: Params) {
	const {
		activeServer: { id: serverId },
	} = useActiveServer()

	const { syncUpdate, syncDelete } = useSyncOnlineToOfflineAnnotations({
		bookId: session.mediaId,
		serverId,
	})

	const queryClient = useQueryClient()

	const invalidateAfterSuccess = () =>
		Promise.all([
			queryClient.invalidateQueries({ queryKey: ['sessionById', session.id], exact: false }),
			queryClient.invalidateQueries({
				queryKey: ['mediaById', session.mediaId, 'readingTimeline'],
				exact: false,
			}),
		])

	const { mutateAsync: updateAnnotation } = useGraphQLMutation(updateAnnotationMutation, {
		onError: (error) => {
			console.error('Failed to update annotation:', error)
		},
		onSuccess: ({ updateAnnotation: updatedAnnotation }) => {
			invalidateAfterSuccess()
			syncUpdate(updatedAnnotation.id, updatedAnnotation.annotationText ?? null)
		},
	})

	const { mutateAsync: deleteAnnotation } = useGraphQLMutation(deleteAnnotationMutation, {
		onError: (error) => {
			console.error('Failed to delete annotation:', error)
		},
		onSuccess: ({ deleteAnnotation: deletedAnnotation }) => {
			invalidateAfterSuccess()
			syncDelete(deletedAnnotation.id)
		},
	})

	return {
		updateAnnotation,
		deleteAnnotation,
	}
}
