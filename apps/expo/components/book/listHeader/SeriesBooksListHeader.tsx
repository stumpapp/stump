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
	onShowOverview: () => void
	onDownloadSeries: () => void
}

type Props = {
	seriesId: string
	layoutKey: string
	stats: NonNullable<SeriesBooksSceneSeriesNameQuery['seriesById']>['stats']
	additionalActions: SeriesActionsProps
}

export function SeriesBooksListHeader({ seriesId, layoutKey, stats, additionalActions }: Props) {
	const client = useQueryClient()
	const { mutate: scanSeries } = useGraphQLMutation(scanMutation, {
		onSuccess: () => {
			setTimeout(
				() =>
					client.refetchQueries({
						queryKey: ['seriesById', seriesId],
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
				label: 'Scan Series',
				icon: { ios: 'document.viewfinder', android: ScanLine },
				onPress: () => scanSeries({ id: seriesId }),
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
							{ text: 'Download', onPress: additionalActions.onDownloadSeries },
						],
					)
				},
			})
		}

		return result
	}, [additionalActions, checkPermission, scanSeries, seriesId])

	const sortMenu = useSeriesBooksSortAndDisplayMenu({
		layoutKey,
		actions,
	})
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
