import { useLibraries } from '@stump/client'
import { cx, Label, NavigationMenu, ScrollArea, Text } from '@stump/components'
import { CircleSlash2, Library, LibrarySquare } from 'lucide-react'
import React, { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import AutoSizer from 'react-virtualized-auto-sizer'

import { LastVisitedLibrary } from '@/components/library'
import { useAppContext } from '@/context'
import paths from '@/paths'

import TopBarLinkListItem from '../../TopBarLinkListItem'

export default function LibraryNavigationItem() {
	const { libraries } = useLibraries()

	const location = useLocation()

	const { checkPermission } = useAppContext()
	const canCreateLibrary = useMemo(() => checkPermission('library:create'), [checkPermission])

	const renderLibraries = () => {
		if (!libraries?.length) {
			return (
				<div className="flex w-full flex-1 items-center justify-center">
					<div className="flex flex-col items-start gap-y-2">
						<CircleSlash2 className="h-7 w-7 text-muted" />
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
		// const clonedLibraries = Array.from({ length: 20 }).flatMap(() => libraries)

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
									to={paths.libraryOverview(library.id)}
									isActive={location.pathname.startsWith(paths.libraryOverview(library.id))}
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
			<NavigationMenu.Trigger className="bg-sidebar text-contrast-300 hover:bg-sidebar-300">
				<Library className="mr-2 h-4 w-4" />
				Libraries
			</NavigationMenu.Trigger>
			<NavigationMenu.Content>
				<div className="flex gap-3 p-4 md:w-[400px] lg:w-[500px]">
					<LastVisitedLibrary container={(children) => <div className="w-1/3">{children}</div>} />

					<div className="flex w-2/3 shrink-0 flex-col gap-y-2">
						<div className={cx('flex w-full flex-1', { 'flex-col': !libraries?.length })}>
							{renderLibraries()}

							{canCreateLibrary && (
								<TopBarLinkListItem
									to={paths.libraryCreate()}
									isActive={location.pathname.startsWith(paths.libraryCreate())}
									className="shrink-0 justify-center self-end border border-dashed border-edge-200 py-2.5"
								>
									<span className="line-clamp-1 font-medium">Create library</span>
								</TopBarLinkListItem>
							)}
						</div>
					</div>
				</div>
			</NavigationMenu.Content>
		</NavigationMenu.Item>
	)
}
