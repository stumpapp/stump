import { useLibraries } from '@stump/client'
import { Accordion, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Library } from 'lucide-react'
import React, { useMemo } from 'react'
import { useLocation } from 'react-router'

import { useAppContext } from '@/context'
import paths from '@/paths'

import { EntityOptionProps } from '../../../types'
import SideBarButtonLink from '../../SideBarButtonLink'
import LibraryEmoji from './LibraryEmoji'
import LibraryOptionsMenu from './LibraryOptionsMenu'

type Props = {
	isMobile?: boolean
} & EntityOptionProps

export default function LibrarySideBarSection({
	isMobile,
	showCreate = true,
	showLinkToAll = false,
}: Props) {
	const location = useLocation()

	const { t } = useLocaleContext()
	const { libraries } = useLibraries()
	const { checkPermission } = useAppContext()

	const isCurrentLibrary = (id: string) => location.pathname.startsWith(paths.librarySeries(id))

	const canCreateLibrary = useMemo(() => checkPermission('library:create'), [checkPermission])
	const showCreateLink = canCreateLibrary && showCreate

	const renderLibraries = () => {
		if (!libraries || !libraries.length) {
			return (
				<Text className="select-none px-1 py-2" variant="muted" size="sm">
					{t('sidebar.buttons.noLibraries')}
				</Text>
			)
		}

		return libraries.map((library) => {
			const canChange = checkPermission('library:manage') && !isMobile
			const leftContent = (
				<LibraryEmoji
					emoji={library.emoji || undefined}
					placeholder={<Library className="h-4 w-4 shrink-0" />}
					library={library}
					disabled={!canChange}
				/>
			)

			return (
				<SideBarButtonLink
					key={library.id}
					to={paths.librarySeries(library.id)}
					isActive={isCurrentLibrary(library.id)}
					className="pl-2 pr-0"
					leftContent={canChange ? leftContent : undefined}
					rightContent={<LibraryOptionsMenu library={library} />}
				>
					{!canChange && leftContent}
					{library.name}
				</SideBarButtonLink>
			)
		})
	}

	return (
		<Accordion type="single" collapsible className="w-full py-2" defaultValue="libraries">
			<Accordion.Item value="libraries" className="border-none">
				<Accordion.Trigger noUnderline asLabel className="px-1 py-0 pb-2">
					{t('sidebar.buttons.libraries')}
				</Accordion.Trigger>
				<Accordion.Content containerClassName="flex flex-col gap-y-1.5">
					{showLinkToAll && (
						<SideBarButtonLink
							to={paths.libraries()}
							isActive={location.pathname === paths.libraries()}
							variant="action"
						>
							{t('sidebar.buttons.seeAll')}
						</SideBarButtonLink>
					)}
					{renderLibraries()}
					{showCreateLink && (
						<SideBarButtonLink
							to={paths.libraryCreate()}
							isActive={location.pathname === paths.libraryCreate()}
							variant="action"
						>
							{t('sidebar.buttons.createLibrary')}
						</SideBarButtonLink>
					)}
				</Accordion.Content>
			</Accordion.Item>
		</Accordion>
	)
}
