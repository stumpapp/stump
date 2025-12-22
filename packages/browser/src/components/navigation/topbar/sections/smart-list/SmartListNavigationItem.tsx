import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { cn, Label, NavigationMenu, ScrollArea, Text } from '@stump/components'
import { FilterableArrangementEntityLink, graphql } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { CircleSlash2, FileStack, List } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import AutoSizer from 'react-virtualized-auto-sizer'

import { EntityOptionProps } from '@/components/navigation/types'
import paths from '@/paths'
import { usePrefetchSmartList } from '@/scenes/smartList'

import TopBarLinkListItem from '../../TopBarLinkListItem'

const query = graphql(`
	query SmartListNavigationItem {
		smartLists {
			id
			name
		}
	}
`)

type Props = EntityOptionProps

export default function SmartListNavigationItem({
	links = [FilterableArrangementEntityLink.Create],
	width,
}: Props) {
	const { sdk } = useSDK()
	const {
		data: { smartLists: lists },
	} = useSuspenseGraphQL(query, sdk.cacheKey('smartLists'))

	const location = useLocation()
	const { t } = useLocaleContext()

	const { prefetch } = usePrefetchSmartList()

	const renderSmartLists = () => {
		if (!lists?.length) {
			return (
				<div className="flex w-full flex-1 items-center justify-start px-2">
					<div className="flex flex-col items-start gap-y-2">
						<CircleSlash2 className="h-7 w-7 text-foreground-muted" />
						<div className="text-left">
							<Label>{t('sidebar.buttons.noSmartlists')}</Label>
							<Text size="sm" variant="muted">
								Create your first smart list to get started
							</Text>
						</div>
					</div>
				</div>
			)
		}

		return (
			<AutoSizer>
				{({ height, width }) => (
					<ScrollArea className="flex flex-col gap-y-2" style={{ height: height - 48, width }}>
						{lists.map((list) => (
							<div key={list.id} className="w-full">
								<TopBarLinkListItem
									to={paths.smartList(list.id)}
									isActive={location.pathname.startsWith(paths.smartList(list.id))}
									onMouseEnter={() => prefetch({ id: list.id })}
								>
									<FileStack className="mr-2 h-4 w-4 shrink-0" />
									<span className="font-medium">{list.name}</span>
								</TopBarLinkListItem>
							</div>
						))}
					</ScrollArea>
				)}
			</AutoSizer>
		)
	}

	const showCreateLink = links.includes(FilterableArrangementEntityLink.Create)
	const showLinkToAll = links.includes(FilterableArrangementEntityLink.ShowAll)

	return (
		<NavigationMenu.Item>
			<NavigationMenu.Trigger className="bg-sidebar text-foreground-subtle hover:bg-sidebar-surface-hover">
				<List className="mr-2 h-4 w-4" />
				{t('sidebar.buttons.smartlists')}
			</NavigationMenu.Trigger>
			<NavigationMenu.Content>
				<div
					style={{ width }}
					className={cn('flex min-h-[150px] min-w-[300px] flex-col gap-3 p-2', {
						'md:w-[400px] lg:w-[500px]': !width,
						'md:w-[300px] lg:w-[350px]': !width && !lists?.length,
					})}
				>
					<div className="flex w-full flex-1 flex-col gap-y-2">
						{renderSmartLists()}

						<div className="flex-1" />

						<div className="flex w-full items-center gap-2">
							{showCreateLink && (
								<TopBarLinkListItem
									to={paths.smartListCreate()}
									isActive={location.pathname.startsWith(paths.smartListCreate())}
									className="justify-center self-end border border-dashed border-edge-subtle p-1"
								>
									<span className="line-clamp-1 text-sm font-medium">
										{t('sidebar.buttons.createSmartlist')}
									</span>
								</TopBarLinkListItem>
							)}

							{showLinkToAll && (
								<TopBarLinkListItem
									to={paths.smartLists()}
									isActive={location.pathname.startsWith(paths.smartLists())}
									className="justify-center self-end border border-dashed border-edge-subtle p-1"
								>
									<span className="line-clamp-1 text-sm font-medium">
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
