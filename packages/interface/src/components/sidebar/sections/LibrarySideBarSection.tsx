import { useLibraries } from '@stump/client'
import { Accordion, Spacer } from '@stump/components'
import { Library } from 'lucide-react'
import React from 'react'
import { useLocation } from 'react-router'

import { useLocaleContext } from '../../../i18n'
import paths from '../../../paths'
import LibraryOptionsMenu from '../LibraryOptionsMenu'
import SideBarButtonLink from '../SideBarButtonLink'

export default function LibrarySideBarSection() {
	const location = useLocation()

	const { t } = useLocaleContext()
	const { libraries } = useLibraries()

	const isCurrentLibrary = (id: string) => location.pathname.startsWith(paths.libraryOverview(id))

	const renderLibraries = () => {
		if (!libraries || !libraries.length) {
			return null
		}

		return libraries.map((library) => (
			<SideBarButtonLink
				key={library.id}
				href={paths.libraryOverview(library.id)}
				isActive={isCurrentLibrary(library.id)}
				className="pl-2 pr-0"
			>
				<Library className="mr-2 h-4 w-4" />
				<span>{library.name}</span>
				<Spacer />
				<LibraryOptionsMenu library={library} />
			</SideBarButtonLink>
		))
	}

	return (
		<Accordion type="single" collapsible className="w-full" defaultValue="libraries">
			<Accordion.Item value="libraries" className="border-none">
				<Accordion.Trigger noUnderline asLabel className="px-1 py-0 pb-2">
					{t('sidebar.buttons.libraries')}
				</Accordion.Trigger>
				<Accordion.Content containerClassName="flex flex-col gap-y-1.5">
					{renderLibraries()}
					<SideBarButtonLink
						href={paths.libraryCreate()}
						isActive={location.pathname === paths.libraryCreate()}
						variant="action"
					>
						{t('sidebar.buttons.createLibrary')}
					</SideBarButtonLink>
				</Accordion.Content>
			</Accordion.Item>
		</Accordion>
	)
}
