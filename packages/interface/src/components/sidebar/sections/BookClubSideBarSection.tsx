import { useBookClubsQuery, useUserStore } from '@stump/client'
import { Accordion } from '@stump/components'
import React from 'react'
import { useLocation } from 'react-router'

import { useLocaleContext } from '../../../i18n'
import paths from '../../../paths'
import SideBarButtonLink from '../SideBarButtonLink'

export default function BookClubSideBarSection() {
	const location = useLocation()
	const checkUserPermission = useUserStore((state) => state.checkUserPermission)

	const { t } = useLocaleContext()
	const { bookClubs } = useBookClubsQuery({ params: { all: false } })

	const isCurrentBookClub = (id: string) => location.pathname.startsWith(paths.libraryOverview(id))

	const renderBookClubs = () => {
		if (!bookClubs || !bookClubs.length) {
			return null
		}

		return bookClubs.map((bookClub) => (
			<SideBarButtonLink
				key={bookClub.id}
				href={paths.bookClub(bookClub.id)}
				isActive={isCurrentBookClub(bookClub.id)}
				className="pl-2 pr-0"
			>
				<span>{bookClub.name}</span>
			</SideBarButtonLink>
		))
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
							href={paths.bookClubCreate()}
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
