import { useGraphQLMutation } from '@stump/client'
import { graphql, LibrarySeriesScreenSeriesNameQuery, UserPermission } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { Info, ScanLine } from 'lucide-react-native'
import { useMemo } from 'react'

import { useStumpServer } from '~/components/activeServer'
import { useEntityListHeader } from '~/components/filter/EntityListHeader'
import { ActionDef } from '~/components/filter/types'
import { useSeriesFilterMenu } from '~/components/series/listHeader/SeriesFilterMenu'
import { useSeriesSortAndDisplayMenu } from '~/components/series/listHeader/SeriesSortAndDisplayMenu'
import { MiniEntityStatCards } from '~/components/stats'

const scanMutation = graphql(`
	mutation LibrarySeriesListHeaderScanLibrary($id: ID!) {
		scanLibrary(id: $id)
	}
`)

type LibraryActions = {
	onShowOverview: () => void
}

type Props = {
	libraryId: string
	stats: NonNullable<LibrarySeriesScreenSeriesNameQuery['libraryById']>['stats']
	additionalActions: LibraryActions
}

export function LibrarySeriesListHeader({ libraryId, stats, additionalActions }: Props) {
	const client = useQueryClient()
	const { mutate: scanLibrary } = useGraphQLMutation(scanMutation, {
		onSuccess: () => {
			setTimeout(
				() =>
					client.refetchQueries({
						queryKey: ['libraryById', libraryId],
						exact: false,
					}),
				2000,
			)
		},
	})

	const { checkPermission } = useStumpServer()

	const actions = useMemo(() => {
		const result: ActionDef[] = [
			{
				key: 'overview',
				label: 'Overview',
				icon: { ios: 'info.circle', android: Info },
				onPress: additionalActions.onShowOverview,
			},
		]

		if (checkPermission(UserPermission.ScanLibrary)) {
			result.push({
				key: 'scan',
				label: 'Scan Library',
				icon: { ios: 'document.viewfinder', android: ScanLine },
				onPress: () => scanLibrary({ id: libraryId }),
			})
		}

		return result
	}, [additionalActions, checkPermission, scanLibrary, libraryId])

	const sortMenu = useSeriesSortAndDisplayMenu({
		layoutKey: `library-${libraryId}-series`,
		actions,
	})
	const filterMenu = useSeriesFilterMenu({ libraryType: false })

	const menuFragment = useEntityListHeader({
		filterMenu,
		sortMenu,
	})

	return (
		<>
			{menuFragment}
			<MiniEntityStatCards stats={stats} />
		</>
	)
}
