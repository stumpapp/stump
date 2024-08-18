import { useBookClubsQuery } from '@stump/client'
import { Accordion, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Club } from 'lucide-react'
import React from 'react'
import { useLocation } from 'react-router'

import { EntityOptionProps } from '@/components/navigation/types'
import { useAppContext } from '@/context'
import paths from '@/paths'

import SideBarButtonLink from '../../SideBarButtonLink'
import BookClubEmoji from './BookClubEmoji'

type Props = {
	isMobile?: boolean
} & EntityOptionProps

export default function BookClubSideBarSection({
	isMobile,
	showCreate = true,
	showLinkToAll = false,
}: Props) {
	const location = useLocation()
	const { user, isServerOwner, checkPermission } = useAppContext()

	const { t } = useLocaleContext()
	const { bookClubs } = useBookClubsQuery({ params: { all: false } })

	const isCurrentBookClub = (id: string) => location.pathname.startsWith(paths.librarySeries(id))

	const renderBookClubs = () => {
		if (!bookClubs || !bookClubs.length) {
			return (
				<Text className="select-none px-1 py-2" variant="muted" size="sm">
					{t('sidebar.buttons.noBookClubs')}
				</Text>
			)
		}

		return bookClubs.map((bookClub) => {
			const userId = user.id
			const member = bookClub.members?.find((member) => member.user_id === userId)
			const canChange =
				(isServerOwner || member?.role === 'CREATOR' || member?.role === 'ADMIN') && !isMobile

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

	const canCreateBookClub = checkPermission('bookclub:create')
	const showCreateLink = canCreateBookClub && showCreate

	return (
		<Accordion type="single" collapsible className="w-full py-2">
			<Accordion.Item value="bookClubs" className="border-none">
				<Accordion.Trigger noUnderline asLabel className="px-1 py-0 pb-2">
					{t('sidebar.buttons.bookClubs')}
				</Accordion.Trigger>
				<Accordion.Content containerClassName="flex flex-col gap-y-1.5">
					{showLinkToAll && (
						<SideBarButtonLink
							to={paths.bookClubs()}
							isActive={location.pathname === paths.bookClubs()}
							variant="action"
						>
							{t('sidebar.buttons.seeAll')}
						</SideBarButtonLink>
					)}
					{renderBookClubs()}
					{showCreateLink && (
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
