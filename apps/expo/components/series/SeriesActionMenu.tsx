import { useGraphQLMutation } from '@stump/client'
import { graphql, UserPermission } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { Stack, useNavigation } from 'expo-router'
import { DownloadCloud, Info, ScanLine } from 'lucide-react-native'
import { useLayoutEffect } from 'react'
import { Alert } from 'react-native'
import { Platform } from 'react-native'

import { useStumpServer } from '../activeServer'
import { ActionMenu } from '../ui/action-menu/action-menu'

const mutation = graphql(`
	mutation SeriesActionMenuScanSeries($id: ID!) {
		scanSeries(id: $id)
	}
`)

type Props = {
	seriesId: string
	onShowOverview: () => void
	onDownloadSeries: () => void
}

export default function SeriesActionMenu({ seriesId, onShowOverview, onDownloadSeries }: Props) {
	const { checkPermission } = useStumpServer()

	const client = useQueryClient()
	const { mutate } = useGraphQLMutation(mutation, {
		onSuccess: () => {
			setTimeout(
				() => client.refetchQueries({ queryKey: ['seriesById', seriesId], exact: false }),
				2000,
			)
		},
	})

	const handleDownload = () => {
		Alert.alert(
			'Download Series',
			`Are you sure you want to enqueue the download for this entire series?`,
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Download',
					onPress: () => onDownloadSeries(),
				},
			],
		)
	}

	return Platform.select({
		ios: (
			<Stack.Toolbar placement="right">
				<Stack.Toolbar.Menu icon="ellipsis">
					<Stack.Toolbar.Menu inline>
						<Stack.Toolbar.MenuAction icon="info.circle" onPress={onShowOverview}>
							Overview
						</Stack.Toolbar.MenuAction>
					</Stack.Toolbar.Menu>

					{checkPermission(UserPermission.ScanLibrary) && (
						<Stack.Toolbar.MenuAction
							icon="document.viewfinder"
							onPress={() => mutate({ id: seriesId })}
						>
							Scan Series
						</Stack.Toolbar.MenuAction>
					)}
					{checkPermission(UserPermission.DownloadFile) && (
						<Stack.Toolbar.MenuAction icon="arrow.down.circle" onPress={handleDownload}>
							Download Series
						</Stack.Toolbar.MenuAction>
					)}
				</Stack.Toolbar.Menu>
			</Stack.Toolbar>
		),
		android: (
			<ActionMenu
				groups={[
					{
						items: [
							{
								icon: {
									ios: 'info.circle',
									android: Info,
								},
								label: 'Overview',
								onPress: onShowOverview,
							},
						],
					},
					...(checkPermission(UserPermission.ScanLibrary)
						? [
								{
									items: [
										{
											icon: {
												ios: 'document.viewfinder',
												android: ScanLine,
											},
											label: 'Scan Series',
											onPress: () => mutate({ id: seriesId }),
										} as const,
									],
								},
							]
						: []),
					...(checkPermission(UserPermission.DownloadFile)
						? [
								{
									items: [
										{
											icon: {
												ios: 'arrow.down.circle',
												android: DownloadCloud,
											},
											label: 'Download Series',
											onPress: handleDownload,
										} as const,
									],
								},
							]
						: []),
				]}
			/>
		),
	})
}

export function useSeriesMenu(props: Props) {
	const navigation = useNavigation()
	useLayoutEffect(() => {
		if (Platform.OS === 'android') {
			navigation.setOptions({
				headerRight: () => <SeriesActionMenu {...props} />,
			})
		}
	}, [navigation, props])

	if (Platform.OS === 'ios') {
		return <SeriesActionMenu {...props} />
	}

	return null
}
