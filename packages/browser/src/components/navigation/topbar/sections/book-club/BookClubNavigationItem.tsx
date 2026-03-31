import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { cn, Label, NavigationMenu, ScrollArea, Text } from '@stump/components'
import { FilterableArrangementEntityLink, graphql, UserPermission } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { CircleSlash2, Club } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import AutoSizer from 'react-virtualized-auto-sizer'

import { EntityOptionProps } from '@/components/navigation/types'
import { useAppContext } from '@/context'
import paths from '@/paths'

import TopBarLinkListItem from '../../TopBarLinkListItem'

const query = graphql(`
	query BookClubNavigationItem {
		bookClubs {
			id
			name
			slug
			emoji
		}
	}
`)

type Props = EntityOptionProps

export default function BookClubNavigationItem({
	links = [FilterableArrangementEntityLink.Create],
	width,
}: Props) {
	const { sdk } = useSDK()
	const {
		data: { bookClubs },
	} = useSuspenseGraphQL(query, sdk.cacheKey('bookClubs'))

	const location = useLocation()
	const { t } = useLocaleContext()
	const { checkPermission } = useAppContext()

	const canCreateBookClub = checkPermission(UserPermission.CreateBookClub)
	const showCreateLink = canCreateBookClub && links.includes(FilterableArrangementEntityLink.Create)
	const showLinkToAll = links.includes(FilterableArrangementEntityLink.ShowAll)

	const renderBookClubs = () => {
		if (!bookClubs?.length) {
			return (
				<div className="px-2 flex w-full flex-1 items-center justify-start">
					<div className="gap-y-2 flex flex-col items-start">
						<CircleSlash2 className="h-7 w-7 text-foreground-muted" />
						<div className="text-left">
							<Label>{t('sidebar.buttons.noBookClubs')}</Label>
							<Text size="sm" variant="muted">
								Join or create a book club to get started
							</Text>
						</div>
					</div>
				</div>
			)
		}

		return (
			<AutoSizer>
				{({ height, width }) => (
					<ScrollArea
						className="gap-y-2 flex flex-col"
						style={{ height: canCreateBookClub ? height - 48 : height, width }}
					>
						{bookClubs.map((club) => (
							<div key={club.id} className="w-full">
								<TopBarLinkListItem
									to={paths.bookClub(club.slug)}
									isActive={location.pathname.startsWith(paths.bookClub(club.slug))}
									className="h-9"
								>
									{club.emoji ? (
										<span className="mr-2 h-4 w-4 shrink-0">{club.emoji}</span>
									) : (
										<Club className="mr-2 h-4 w-4 shrink-0" />
									)}
									<span className="font-medium line-clamp-1">{club.name}</span>
								</TopBarLinkListItem>
							</div>
						))}
					</ScrollArea>
				)}
			</AutoSizer>
		)
	}

	return (
		<NavigationMenu.Item>
			<NavigationMenu.Trigger className="bg-sidebar text-foreground-subtle hover:bg-sidebar-surface-hover">
				<Club className="mr-2 h-4 w-4" />
				{t('sidebar.buttons.bookClubs')}
			</NavigationMenu.Trigger>
			<NavigationMenu.Content>
				<div
					style={{ width }}
					className={cn('gap-3 p-2 flex min-h-[150px] min-w-[300px] flex-col', {
						'md:w-[400px] lg:w-[500px]': !width,
						'md:w-[300px] lg:w-[350px]': !width && !bookClubs?.length,
					})}
				>
					<div className="gap-y-2 flex w-full flex-1 flex-col">
						{renderBookClubs()}

						<div className="gap-2 flex w-full items-center">
							{showCreateLink && (
								<TopBarLinkListItem
									to={paths.bookClubCreate()}
									isActive={location.pathname.startsWith(paths.bookClubCreate())}
									className="p-1 justify-center self-end border border-dashed border-edge-subtle"
								>
									<span className="text-sm font-medium line-clamp-1">
										{t('sidebar.buttons.createBookClub')}
									</span>
								</TopBarLinkListItem>
							)}

							{showLinkToAll && (
								<TopBarLinkListItem
									to={paths.bookClubs()}
									isActive={location.pathname.startsWith(paths.bookClubs())}
									className="p-1 justify-center self-end border border-dashed border-edge-subtle"
								>
									<span className="text-sm font-medium line-clamp-1">
										{t('sidebar.buttons.seeAll')}
									</span>
								</TopBarLinkListItem>
							)}
						</div>
					</div>
				</div>
			</NavigationMenu.Content>
		</NavigationMenu.Item>
	)
}
