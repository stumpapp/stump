import { useGraphQLMutation } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useCallback, useState } from 'react'

type Params = {
	id: string
	isFavorite: boolean
	onSuccess?: (isFavorite: boolean) => void
}

const mutation = graphql(`
	mutation UseFavoriteBook($id: ID!, $isFavorite: Boolean!) {
		favoriteMedia(id: $id, isFavorite: $isFavorite) {
			id
			isFavorite
		}
	}
`)

export function useFavoriteBook({ id, onSuccess, ...params }: Params) {
	const [isFavorite, setIsFavorite] = useState(params.isFavorite)

	const { mutate } = useGraphQLMutation(mutation, {
		onMutate: (data) => {
			setIsFavorite(data.isFavorite)
		},
		onSuccess: (data) => {
			setIsFavorite(data.favoriteMedia.isFavorite)
			onSuccess?.(data.favoriteMedia.isFavorite)
		},
		onError: (error, variables) => {
			setIsFavorite(!variables.isFavorite)
		},
	})

	const favoriteBook = useCallback(
		() =>
			mutate({
				id,
				isFavorite: !isFavorite,
			}),
		[id, isFavorite, mutate],
	)

	return { isFavorite, favoriteBook }
}
