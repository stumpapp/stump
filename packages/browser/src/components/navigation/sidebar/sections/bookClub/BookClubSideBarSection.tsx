import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { Accordion, Text } from '@stump/components'
import { FilterableArrangementEntityLink, graphql, UserPermission } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { Club } from 'lucide-react'
import { useLocation } from 'react-router'

import { EntityOptionProps } from '@/components/navigation/types'
import { useAppContext } from '@/context'
import paths from '@/paths'

import SideBarButtonLink from '../../SideBarButtonLink'
import BookClubEmoji from './BookClubEmoji'

const query = graphql(`
	query BookClubSideBarSection {
		bookClubs {
			id
			name
			slug
			emoji
			members {
				id
				userId
				role
			}
		}
	}
`)

type Props = EntityOptionProps & {
	isMobile?: boolean
}

export default function BookClubSideBarSection({
	links = [FilterableArrangementEntityLink.Create],
	isMobile,
}: Props) {
	const location = useLocation()
	const { user, isServerOwner, checkPermission } = useAppContext()

	const { t } = useLocaleContext()
	const { sdk } = useSDK()
	const {
		data: { bookClubs },
	} = useSuspenseGraphQL(query, sdk.cacheKey('bookClubs', ['sidebar']))

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
			const member = bookClub.members?.find((member) => member.userId === userId)
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
					to={paths.bookClub(bookClub.slug)}
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

	const canCreateBookClub = checkPermission(UserPermission.CreateBookClub)
	const showCreateLink = canCreateBookClub && links.includes(FilterableArrangementEntityLink.Create)
	const showLinkToAll = links.includes(FilterableArrangementEntityLink.ShowAll)

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
					<div className="ml-2 space-y-1 border-l border-l-edge pl-1">{renderBookClubs()}</div>
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
