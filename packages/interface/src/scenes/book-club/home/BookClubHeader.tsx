import { Avatar, Card, Heading, Text } from '@stump/components'
import dayjs from 'dayjs'
import pluralize from 'pluralize'
import React from 'react'

import { useBookClubContext } from './context'

export default function BookClubHeader() {
	const { bookClub } = useBookClubContext()

	const creator = bookClub.members?.find((member) => member.is_creator)
	const renderCreator = () => {
		if (!creator || (!creator.display_name && !creator.user)) {
			return null
		}

		const displayName = creator.display_name ?? creator.user?.username
		const avatarUrl = creator.user?.avatar_url ?? undefined

		return (
			<Card className="flex items-center justify-between gap-4 p-2.5">
				<Text size="sm" variant="muted">
					Created by
				</Text>

				<div className="flex items-center gap-2">
					<Avatar src={avatarUrl} fallback={displayName} className="h-8 w-8" />
					<Text size="sm">{displayName}</Text>
				</div>
			</Card>
		)
	}

	return (
		<header className="flex flex-col gap-4 p-4 md:flex-row md:items-start md:justify-between md:gap-0">
			<div className="md:max-w-xl">
				<Heading>{bookClub.name}</Heading>
				{/* TODO: read more text for long descriptions... */}
				<Text size="md">{bookClub.description}</Text>

				<div className="mt-2">
					<Text size="sm">
						<b>{bookClub.members?.length}</b>{' '}
						{pluralize(bookClub.member_role_spec['MEMBER'], bookClub?.members?.length || 0)} •{' '}
						Created <b>{dayjs(bookClub.created_at).format('MMMM YYYY')}</b>
					</Text>
				</div>
			</div>

			{renderCreator()}
		</header>
	)
}
