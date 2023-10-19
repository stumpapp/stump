import { useBookClubsQuery, useUserStore } from '@stump/client'
import React from 'react'

import GenericEmptyState from '../../components/GenericEmptyState'
import SceneContainer from '../../components/SceneContainer'

export default function PublicBookClubExplorerScene() {
	const checkUserPermission = useUserStore((store) => store.checkUserPermission)

	const { bookClubs, isLoading } = useBookClubsQuery()

	if (isLoading) return null
	if (!bookClubs?.length) {
		const canCreate = checkUserPermission('bookclub:create')
		const message = canCreate
			? 'Try creating one yourself!'
			: 'Reach out to someone who can create one for you!'
		return <GenericEmptyState title="No book clubs found" subtitle={message} />
	}

	return (
		<SceneContainer>I will eventually show some public book clubs that you can join</SceneContainer>
	)
}
