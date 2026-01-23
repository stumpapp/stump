import { useGraphQLMutation } from '@stump/client'
import { graphql, UserPermission } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { Info, ScanLine } from 'lucide-react-native'

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
}

export default function SeriesActionMenu({ seriesId, onShowOverview }: Props) {
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

	if (!checkPermission(UserPermission.ScanLibrary)) {
		return null
	}

	return (
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
			]}
		/>
	)
}
