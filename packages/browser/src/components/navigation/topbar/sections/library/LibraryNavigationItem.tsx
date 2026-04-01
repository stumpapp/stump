import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { cn, cx, Label, NavigationMenu, ScrollArea, Text } from '@stump/components'
import { FilterableArrangementEntityLink, graphql, UserPermission } from '@stump/graphql'
import { CircleSlash2, Library, LibrarySquare } from 'lucide-react'
import { Suspense, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import AutoSizer from 'react-virtualized-auto-sizer'

import { LastVisitedLibrary } from '@/components/library'
import { EntityOptionProps } from '@/components/navigation/types'
import { useAppContext } from '@/context'
import paths from '@/paths'

import TopBarLinkListItem from '../../TopBarLinkListItem'

const query = graphql(`
	query LibraryNavigationItem {
		libraries(pagination: { none: { unpaginated: true } }) {
			nodes {
				id
				name
				emoji
			}
		}
	}
`)

type Props = EntityOptionProps

export default function LibraryNavigationItem({
	links = [FilterableArrangementEntityLink.Create],
	width,
}: Props) {
	const { sdk } = useSDK()
	const {
		data: {
			libraries: { nodes: libraries },
		},
	} = useSuspenseGraphQL(query, sdk.cacheKey('libraries'))

	const location = useLocation()

	const { checkPermission } = useAppContext()

	const canCreateLibrary = useMemo(
		() => checkPermission(UserPermission.CreateLibrary),
		[checkPermission],
	)
	const showCreateLink = canCreateLibrary && links.includes(FilterableArrangementEntityLink.Create)
	const showLinkToAll = links.includes(FilterableArrangementEntityLink.ShowAll)

	const renderLibraries = () => {
		if (!libraries?.length) {
			return (
				<div className="px-2 flex w-full flex-1 items-center justify-start">
					<div className="gap-y-2 flex flex-col items-start">
						<CircleSlash2 className="h-7 w-7 text-foreground-muted" />
						<div className="text-left">
							<Label>No libraries</Label>
							<Text size="sm" variant="muted">
								You don&apos;t have any libraries yet
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
						style={{ height: canCreateLibrary ? height - 48 : height, width }}
					>
						{libraries.map((library) => (
							<div key={library.id} className="w-full">
								<TopBarLinkListItem
									to={paths.librarySeries(library.id)}
									isActive={location.pathname.startsWith(paths.librarySeries(library.id))}
									className="h-9"
								>
									{library.emoji ? (
										<span className="mr-2 h-4 w-4 shrink-0">{library.emoji}</span>
									) : (
										<LibrarySquare className="mr-2 h-4 w-4 shrink-0" />
									)}
									<span className="font-medium line-clamp-1">{library.name}</span>
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
				<Library className="mr-2 h-4 w-4" />
				Libraries
			</NavigationMenu.Trigger>
			<NavigationMenu.Content>
				<div
					style={{ width }}
					className={cn('gap-3 p-2 flex min-h-[150px] min-w-[300px]', {
						'md:w-[400px] lg:w-[500px]': !width,
						'md:w-[300px] lg:w-[350px]': !width && !libraries?.length,
					})}
				>
					<div
						className={cn('gap-y-2 flex w-2/3 shrink-0 flex-col', {
							'w-full': !libraries?.length,
						})}
					>
						<div className={cx('flex w-full flex-1', { 'gap-y-2 flex-col': !libraries?.length })}>
							{renderLibraries()}

							<div className="gap-2 flex w-full items-center">
								{showCreateLink && (
									<TopBarLinkListItem
										to={paths.libraryCreate()}
										isActive={location.pathname.startsWith(paths.libraryCreate())}
										className="p-1 justify-center self-end border border-dashed border-edge-subtle"
									>
										<span className="text-sm font-medium line-clamp-1">Create library</span>
									</TopBarLinkListItem>
								)}

								{showLinkToAll && (
									<TopBarLinkListItem
										to={paths.libraries()}
										isActive={location.pathname.startsWith(paths.libraries())}
										className="p-1 justify-center self-end border border-dashed border-edge-subtle"
									>
										<span className="text-sm font-medium line-clamp-1">See all</span>
									</TopBarLinkListItem>
								)}
							</div>
						</div>
					</div>

					<Suspense>
						<LastVisitedLibrary container={(children) => <div className="w-1/3">{children}</div>} />
					</Suspense>
				</div>
			</NavigationMenu.Content>
		</NavigationMenu.Item>
	)
}
