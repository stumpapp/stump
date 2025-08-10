import { ALPHABET_STALE_TIME, useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
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

type Props = Omit<React.ComponentProps<typeof Alphabet>, 'alphabet'>

function SeriesBooksAlphabet(props: Props) {
	const {
		series: { id },
	} = useSeriesContext()

	const {
		data: { seriesById: series },
	} = useSuspenseGraphQL(
		query,
		[],
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
