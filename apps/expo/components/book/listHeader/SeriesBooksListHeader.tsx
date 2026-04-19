import { useGraphQLMutation } from '@stump/client'
import { graphql, SeriesBooksSceneSeriesNameQuery, UserPermission } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { DownloadCloud, Info, ScanLine } from 'lucide-react-native'
import { useMemo } from 'react'
import { Alert } from 'react-native'

import { useStumpServer } from '~/components/activeServer'
import { useEntityListHeader } from '~/components/filter/EntityListHeader'
import { ActionDef } from '~/components/filter/types'
import { MiniEntityStatCards } from '~/components/stats'

import { useBooksFilterMenu } from './BooksFilterMenu'
import { useSeriesBooksSortAndDisplayMenu } from './SeriesBooksSortAndDisplayMenu'

const scanMutation = graphql(`
	mutation SeriesBooksListHeaderScanSeries($id: ID!) {
		scanSeries(id: $id)
	}
`)

type SeriesActionsProps = {
	seriesId: string
	onShowOverview: () => void
	onDownloadSeries: () => void
}

type Props = {
	stats: NonNullable<SeriesBooksSceneSeriesNameQuery['seriesById']>['stats']
	seriesActions: SeriesActionsProps
}

export function SeriesBooksListHeader({ stats, seriesActions }: Props) {
	const client = useQueryClient()
	const { mutate: scanSeries } = useGraphQLMutation(scanMutation, {
		onSuccess: () => {
			setTimeout(
				() =>
					client.refetchQueries({
						queryKey: ['seriesById', seriesActions.seriesId],
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
				onPress: seriesActions.onShowOverview,
			},
		]

		if (checkPermission(UserPermission.ScanLibrary)) {
			result.push({
				key: 'scan',
				label: 'Scan Series',
				icon: { ios: 'document.viewfinder', android: ScanLine },
				onPress: () => scanSeries({ id: seriesActions.seriesId }),
			})
		}

		if (checkPermission(UserPermission.DownloadFile)) {
			result.push({
				key: 'download',
				label: 'Download Series',
				icon: { ios: 'arrow.down.circle', android: DownloadCloud },
				onPress: () => {
					Alert.alert(
						'Download Series',
						'Are you sure you want to enqueue the download for this entire series?',
						[
							{ text: 'Cancel', style: 'cancel' },
							{ text: 'Download', onPress: seriesActions.onDownloadSeries },
						],
					)
				},
			})
		}

		return result
	}, [seriesActions, checkPermission, scanSeries])

	const sortMenu = useSeriesBooksSortAndDisplayMenu(actions)
	const filterMenu = useBooksFilterMenu({ libraryType: false })

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
