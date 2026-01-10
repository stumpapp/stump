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
				<div className="flex w-full flex-1 items-center justify-start px-2">
					<div className="flex flex-col items-start gap-y-2">
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
						className="flex flex-col gap-y-2"
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
									<span className="line-clamp-1 font-medium">{library.name}</span>
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
					className={cn('flex min-h-[150px] min-w-[300px] gap-3 p-2', {
						'md:w-[400px] lg:w-[500px]': !width,
						'md:w-[300px] lg:w-[350px]': !width && !libraries?.length,
					})}
				>
					<div
						className={cn('flex w-2/3 shrink-0 flex-col gap-y-2', {
							'w-full': !libraries?.length,
						})}
					>
						<div className={cx('flex w-full flex-1', { 'flex-col gap-y-2': !libraries?.length })}>
							{renderLibraries()}

							<div className="flex w-full items-center gap-2">
								{showCreateLink && (
									<TopBarLinkListItem
										to={paths.libraryCreate()}
										isActive={location.pathname.startsWith(paths.libraryCreate())}
										className="justify-center self-end border border-dashed border-edge-subtle p-1"
									>
										<span className="line-clamp-1 text-sm font-medium">Create library</span>
									</TopBarLinkListItem>
								)}

								{showLinkToAll && (
									<TopBarLinkListItem
										to={paths.libraries()}
										isActive={location.pathname.startsWith(paths.libraries())}
										className="justify-center self-end border border-dashed border-edge-subtle p-1"
									>
										<span className="line-clamp-1 text-sm font-medium">See all</span>
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
