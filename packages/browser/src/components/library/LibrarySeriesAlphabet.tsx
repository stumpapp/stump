import { ALPHABET_STALE_TIME, useSDK, useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { Suspense } from 'react'

import { useLibraryContext } from '@/scenes/library/context'

import { Alphabet } from '../filters'

const query = graphql(`
	query LibrarySeriesAlphabet($id: ID!) {
		libraryById(id: $id) {
			seriesAlphabet
		}
	}
`)

export const usePrefetchLibrarySeriesAlphabet = () => {
	const client = useQueryClient()
	const { sdk } = useSDK()

	return (id: string) =>
		client.prefetchQuery({
			queryKey: ['librarySeriesAlphabet', id],
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

function LibrarySeriesAlphabet(props: Props) {
	const {
		library: { id },
	} = useLibraryContext()

	const {
		data: { libraryById: library },
	} = useSuspenseGraphQL(
		query,
		['librarySeriesAlphabet', id],
		{
			id,
		},
		{
			staleTime: ALPHABET_STALE_TIME,
		},
	)
	const { seriesAlphabet } = library || { seriesAlphabet: {} }

	return <Alphabet alphabet={seriesAlphabet} {...props} />
}

export default function LibrarySeriesAlphabetContainer(props: Props) {
	return (
		<Suspense>
			<LibrarySeriesAlphabet {...props} />
		</Suspense>
	)
}
