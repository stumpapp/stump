import { useGraphQLMutation } from '@stump/client'
import { graphql, UserPermission } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { ScanLine } from 'lucide-react-native'

import { useStumpServer } from '../activeServer'
import { ActionMenu } from '../ui/action-menu/action-menu'

const mutation = graphql(`
	mutation LibraryActionMenuScanLibrary($id: ID!) {
		scanLibrary(id: $id)
	}
`)

type Props = {
	libraryId: string
}

export default function LibraryActionMenu({ libraryId }: Props) {
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
								ios: 'document.viewfinder',
								android: ScanLine,
							},
							label: 'Scan Library',
							onPress: () => mutate({ id: libraryId }),
						},
					],
				},
			]}
		/>
	)
}
