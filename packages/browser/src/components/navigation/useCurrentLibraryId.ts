import { useGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { matchPath, useLocation } from 'react-router'

import { useRouterContext } from '@/context'

const query = graphql(`
	query NavigationEntityLibrary($id: ID!, $isSeries: Boolean!, $isBook: Boolean!) {
		seriesById(id: $id) @include(if: $isSeries) {
			libraryId
		}
		mediaById(id: $id) @include(if: $isBook) {
			libraryId
		}
	}
`)

export default function useCurrentLibraryId() {
	const { pathname } = useLocation()
	const { basePath } = useRouterContext()
	const routeId = (segment: string) =>
		matchPath(`${basePath}/${segment}/:id/*`, pathname)?.params.id

	const libraryId = routeId('libraries')
	const seriesId = routeId('series')
	const bookId = routeId('books')
	const entityId = seriesId ?? bookId
	const entityType = seriesId ? 'series' : bookId ? 'book' : null

	const { data } = useGraphQL(
		query,
		['navigationEntityLibrary', entityType, entityId],
		{
			id: entityId ?? '',
			isSeries: !!seriesId,
			isBook: !!bookId,
		},
		{ enabled: !!entityId },
	)

	return libraryId ?? data?.seriesById?.libraryId ?? data?.mediaById?.libraryId
}
