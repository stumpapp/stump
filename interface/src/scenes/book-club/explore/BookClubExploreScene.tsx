import { useBookClubsQuery } from '@stump/client'
import { ButtonOrLink, cx } from '@stump/components'
import React from 'react'

import { SceneContainer } from '@/components/container'
import GenericEmptyState from '@/components/GenericEmptyState'
import { useAppContext } from '@/context'
import paths from '@/paths'

export default function BookClubExploreScene() {
	const { checkPermission } = useAppContext()

	const canCreate = checkPermission('bookclub:create')

	const { bookClubs, isLoading } = useBookClubsQuery()

	if (isLoading) return null

	const renderContent = () => {
		if (!bookClubs?.length) {
			const message = canCreate
				? 'Try creating one yourself!'
				: 'Reach out to someone who can create one for you!'
			return (
				<div className="flex flex-col items-center">
					<GenericEmptyState title="No book clubs found" subtitle={message} />
					{canCreate && (
						<ButtonOrLink href={paths.bookClubCreate()} variant="secondary">
							Create a book club
						</ButtonOrLink>
					)}
				</div>
			)
		}

		return <>I will eventually show some public book clubs that you can join</>
	}

	return (
		<SceneContainer
			className={cx({ 'flex h-full items-center justify-center': !bookClubs?.length })}
		>
			{renderContent()}
		</SceneContainer>
	)
}
