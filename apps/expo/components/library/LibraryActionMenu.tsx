import { useGraphQLMutation } from '@stump/client'
import { graphql, UserPermission } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { Stack, useNavigation } from 'expo-router'
import { Info, ScanLine } from 'lucide-react-native'
import { useLayoutEffect } from 'react'
import { Platform } from 'react-native'

import { useStumpServer } from '../activeServer'
import { ActionMenu } from '../ui/action-menu/action-menu'

const mutation = graphql(`
	mutation LibraryActionMenuScanLibrary($id: ID!) {
		scanLibrary(id: $id)
	}
`)

type Props = {
	libraryId: string
	onShowOverview: () => void
}

export default function LibraryActionMenu({ libraryId, onShowOverview }: Props) {
	const { checkPermission } = useStumpServer()

	const client = useQueryClient()
	const { mutate } = useGraphQLMutation(mutation, {
		onSuccess: () => {
			setTimeout(
				() => client.refetchQueries({ queryKey: ['libraryById', libraryId], exact: false }),
				2000,
			)
		},
	})

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
							onPress={() => mutate({ id: libraryId })}
						>
							Scan Library
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
											label: 'Scan Library',
											onPress: () => mutate({ id: libraryId }),
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

export function useLibraryMenu(props: Props) {
	const navigation = useNavigation()
	useLayoutEffect(() => {
		if (Platform.OS === 'android') {
			navigation.setOptions({
				headerRight: () => <LibraryActionMenu {...props} />,
			})
		}
	}, [navigation, props])

	if (Platform.OS === 'ios') {
		return <LibraryActionMenu {...props} />
	}

	return null
}
