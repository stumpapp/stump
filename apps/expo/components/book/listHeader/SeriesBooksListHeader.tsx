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
import { useTranslate } from '~/lib/hooks'

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
	const { t } = useTranslate()
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
				label: t('common.overview'),
				icon: { ios: 'info.circle', android: Info },
				onPress: additionalActions.onShowOverview,
			},
		]

		if (checkPermission(UserPermission.ScanLibrary)) {
			result.push({
				key: 'scan',
				label: t('entityActions.scanSeries'),
				icon: { ios: 'document.viewfinder', android: ScanLine },
				onPress: () => scanSeries({ id: seriesId }),
			})
		}

		if (checkPermission(UserPermission.DownloadFile)) {
			result.push({
				key: 'download',
				label: t('entityActions.downloadSeries'),
				icon: { ios: 'arrow.down.circle', android: DownloadCloud },
				onPress: () => {
					Alert.alert(
						t('entityActions.downloadSeries'),
						t('entityActions.downloadSeriesConfirmation'),
						[
							{ text: t('common.cancel'), style: 'cancel' },
							{ text: t('common.download'), onPress: additionalActions.onDownloadSeries },
						],
					)
				},
			})
		}

		return result
	}, [additionalActions, checkPermission, scanSeries, seriesId, t])

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
