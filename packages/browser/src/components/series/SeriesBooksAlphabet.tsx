import { ALPHABET_STALE_TIME, useSDK, useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { Suspense } from 'react'

import { useSeriesContext } from '@/scenes/series'

import { Alphabet } from '../filters'

const query = graphql(`
	query SeriesBooksAlphabet($id: ID!) {
		seriesById(id: $id) {
			mediaAlphabet
		}
	}
`)

export const usePrefetchSeriesBooksAlphabet = () => {
	const client = useQueryClient()
	const { sdk } = useSDK()

	return (id: string) =>
		client.prefetchQuery({
			queryKey: ['seriesBooksAlphabet', id],
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

function SeriesBooksAlphabet(props: Props) {
	const {
		series: { id },
	} = useSeriesContext()

	const {
		data: { seriesById: series },
	} = useSuspenseGraphQL(
		query,
		['seriesBooksAlphabet', id],
		{
			id,
		},
		{
			staleTime: ALPHABET_STALE_TIME,
		},
	)
	const { mediaAlphabet } = series || { mediaAlphabet: {} }

	return <Alphabet alphabet={mediaAlphabet} {...props} />
}

export default function SeriesBooksAlphabetContainer(props: Props) {
	return (
		<Suspense>
			<SeriesBooksAlphabet {...props} />
		</Suspense>
	)
}
