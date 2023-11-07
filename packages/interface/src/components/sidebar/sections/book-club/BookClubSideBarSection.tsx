import { useBookClubsQuery, useUserStore } from '@stump/client'
import { Accordion } from '@stump/components'
import { Club } from 'lucide-react'
import React from 'react'
import { useLocation } from 'react-router'

import { useAppContext } from '../../../../context'
import { useLocaleContext } from '../../../../i18n'
import paths from '../../../../paths'
import SideBarButtonLink from '../../SideBarButtonLink'
import BookClubEmoji from './BookClubEmoji'

export default function BookClubSideBarSection() {
	const location = useLocation()
	const checkUserPermission = useUserStore((state) => state.checkUserPermission)
	const { user, isServerOwner } = useAppContext()

	const { t } = useLocaleContext()
	const { bookClubs } = useBookClubsQuery({ params: { all: false } })

	const isCurrentBookClub = (id: string) => location.pathname.startsWith(paths.libraryOverview(id))

	const renderBookClubs = () => {
		if (!bookClubs || !bookClubs.length) {
			return null
		}

		return bookClubs.map((bookClub) => {
			const userId = user.id
			const member = bookClub.members?.find((member) => member.user_id === userId)
			const canChange = isServerOwner || member?.role === 'CREATOR' || member?.role === 'ADMIN'

			const leftContent = (
				<BookClubEmoji
					emoji={bookClub.emoji || undefined}
					placeholder={<Club className="h-4 w-4 shrink-0" />}
					bookClub={bookClub}
					disabled={!canChange}
				/>
			)

			return (
				<SideBarButtonLink
					key={bookClub.id}
					to={paths.bookClub(bookClub.id)}
					isActive={isCurrentBookClub(bookClub.id)}
					leftContent={canChange ? leftContent : undefined}
					className="pl-2 pr-0"
				>
					{!canChange && leftContent}
					{bookClub.name}
				</SideBarButtonLink>
			)
		})
	}

	const canCreateBookClub = checkUserPermission('bookclub:create')

	return (
		<Accordion type="single" collapsible className="w-full">
			<Accordion.Item value="bookClubs" className="border-none">
				<Accordion.Trigger noUnderline asLabel className="px-1 py-0 pb-2">
					{t('sidebar.buttons.bookClubs')}
				</Accordion.Trigger>
				<Accordion.Content containerClassName="flex flex-col gap-y-1.5">
					{renderBookClubs()}
					{canCreateBookClub && (
						<SideBarButtonLink
							to={paths.bookClubCreate()}
							isActive={location.pathname === paths.bookClubCreate()}
							variant="action"
						>
							{t('sidebar.buttons.createBookClub')}
						</SideBarButtonLink>
					)}
				</Accordion.Content>
			</Accordion.Item>
		</Accordion>
	)
}
