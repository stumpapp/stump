import { ALPHABET_STALE_TIME, useSDK, useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { Suspense } from 'react'

import { Alphabet } from '@/components/filters'

const query = graphql(`
	query BooksAlphabet {
		mediaAlphabet
	}
`)

export const usePrefetchBooksAlphabet = () => {
	const client = useQueryClient()
	const { sdk } = useSDK()

	return () =>
		client.prefetchQuery({
			queryKey: ['booksAlphabet'],
			queryFn: async () => {
				const response = await sdk.execute(query)
				return response
			},
			staleTime: ALPHABET_STALE_TIME,
		})
}

type Props = Omit<React.ComponentProps<typeof Alphabet>, 'alphabet'>

function BooksAlphabet(props: Props) {
	const {
		data: { mediaAlphabet },
	} = useSuspenseGraphQL(query, ['booksAlphabet'], undefined, {
		staleTime: ALPHABET_STALE_TIME,
	})

	return <Alphabet alphabet={mediaAlphabet} {...props} />
}

export default function BooksAlphabetContainer(props: Props) {
	return (
		<Suspense>
			<BooksAlphabet {...props} />
		</Suspense>
	)
}
