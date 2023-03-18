import { Heading, Text } from '@stump/components'
import { useLocation } from 'react-router'

/**
 * Component that renders the sidebar for the library admin pages. Mostly,
 * this will just showcase a preview of the resolved library, either a completely
 * new library or an existing library that is being edited.
 */
export default function LibraryAdminSideBar() {
	const location = useLocation()

	const isEditingLibrary = location.pathname.includes('/edit')

	return (
		<aside className="hidden min-h-full md:flex md:flex-col">
			<div className="relative z-10 flex h-full w-[12.5rem] flex-1 shrink-0 flex-col gap-4 border-r border-gray-75 p-4 dark:border-gray-850/70">
				<Heading size="xs">Library Configuration</Heading>

				<nav className="flex h-full w-full flex-1 flex-col gap-4">
					<Text size="xs" variant="muted">
						A preview of your {isEditingLibrary ? 'library edits' : 'new library'} will be shown
						below.
					</Text>
				</nav>
			</div>
		</aside>
	)
}
