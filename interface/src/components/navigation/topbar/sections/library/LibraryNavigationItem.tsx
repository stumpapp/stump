import { useLibraries } from '@stump/client'
import { NavigationMenu, navigationMenuTriggerStyle } from '@stump/components'
import { Library, LibrarySquare } from 'lucide-react'
import React from 'react'
import { useLocation } from 'react-router-dom'

import { LastVisitedLibrary } from '@/components/library'
import paths from '@/paths'

import TopBarLinkListItem from '../../TopBarLinkListItem'

// TODO: empty state
// TODO: create library button link (if allowed)

export default function LibraryNavigationItem() {
	const { libraries } = useLibraries()

	const location = useLocation()

	const renderLibraries = () => {
		if (!libraries || !libraries.length) {
			return null
		}

		return libraries.map((library) => (
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
		))
	}

	return (
		<NavigationMenu.Item>
			<NavigationMenu.Trigger
				className={navigationMenuTriggerStyle({
					className: 'bg-sidebar text-contrast-300 hover:bg-sidebar-300',
				})}
			>
				<Library className="mr-2 h-4 w-4" />
				Libraries
			</NavigationMenu.Trigger>
			<NavigationMenu.Content>
				<div className="flex gap-3 p-4 md:w-[400px] lg:w-[500px]">
					<LastVisitedLibrary container={(children) => <div className="w-2/3">{children}</div>} />

					<div className="flex w-full flex-col gap-y-2">{renderLibraries()}</div>
				</div>
			</NavigationMenu.Content>
		</NavigationMenu.Item>
	)
}
