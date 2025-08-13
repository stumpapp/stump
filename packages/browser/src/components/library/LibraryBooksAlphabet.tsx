import { ALPHABET_STALE_TIME, useSDK, useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { Suspense } from 'react'

import { useLibraryContext } from '@/scenes/library/context'

import { Alphabet } from '../filters'

const query = graphql(`
	query LibraryBooksAlphabet($id: ID!) {
		libraryById(id: $id) {
			mediaAlphabet
		}
	}
`)

export const usePrefetchLibraryBooksAlphabet = () => {
	const client = useQueryClient()
	const { sdk } = useSDK()

	return (id: string) =>
		client.prefetchQuery({
			queryKey: ['libraryBooksAlphabet', id],
			queryFn: async () => {
				const response = await sdk.execute(query, {
					id,
				})
				return response
			},
			staleTime: ALPHABET_STALE_TIME,
		})
}

type Props = Omit<React.ComponentProps<typeof Alphabet>, 'alphabet'>

function LibraryBooksAlphabet(props: Props) {
	const {
		library: { id },
	} = useLibraryContext()

	const {
		data: { libraryById: library },
	} = useSuspenseGraphQL(
		query,
		['libraryBooksAlphabet', id],
		{
			id,
		},
		{
			staleTime: ALPHABET_STALE_TIME,
		},
	)
	const { mediaAlphabet } = library || { mediaAlphabet: {} }

	return <Alphabet alphabet={mediaAlphabet} {...props} />
}

export default function LibraryBooksAlphabetContainer(props: Props) {
	return (
		<Suspense>
			<LibraryBooksAlphabet {...props} />
		</Suspense>
	)
}
