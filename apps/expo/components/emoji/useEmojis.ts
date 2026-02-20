import { useGraphQL, usePrefetchGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import groupBy from 'lodash/groupBy'
import { useCallback, useMemo } from 'react'

import { useActiveServer } from '../activeServer'
import emojis from './data.json'
import { Emoji } from './types'

const query = graphql(`
	query useEmojis {
		customEmojis {
			id
			name
			isAnimated
			url
		}
	}
`)

export function usePrefetchEmojis() {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { client, execute, onError } = usePrefetchGraphQL()
	return useCallback(() => {
		client
			.prefetchQuery({
				queryKey: ['emojis', serverID],
				queryFn: () => execute(query),
				staleTime: 24 * 60 * 60 * 1000, // 1 day, might be too aggressive
			})
			.catch(onError)
	}, [client, onError, serverID, execute])
}

export function useEmojis() {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { data } = useGraphQL(query, ['emojis', serverID])

	const customEmojis = useMemo(
		() =>
			(data?.customEmojis || []).map(
				(emoji) =>
					({
						...emoji,
						category: 'Server',
						keywords: [emoji.name],
					}) satisfies Emoji,
			),
		[data],
	)

	const allEmojis = useMemo(() => {
		return [...emojis, ...customEmojis]
	}, [customEmojis])

	return useMemo(() => {
		return groupBy(allEmojis, (emoji) => emoji.category)
	}, [allEmojis])
}
