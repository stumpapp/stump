import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { Accordion, Text } from '@stump/components'
import { FilterableArrangementEntityLink, graphql, UserPermission } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { Library } from 'lucide-react'
import { useMemo } from 'react'
import { useLocation } from 'react-router'

import { useAppContext } from '@/context'
import { usePaths } from '@/paths'
import { usePrefetchLibrarySeries } from '@/scenes/library/tabs/series/LibrarySeriesScene'

import { EntityOptionProps } from '../../../types'
import SideBarButtonLink from '../../SideBarButtonLink'
import LibraryEmoji from './LibraryEmoji'
import LibraryOptionsMenu from './LibraryOptionsMenu'

const query = graphql(`
	query LibrarySideBarSection {
		libraries(pagination: { none: { unpaginated: true } }) {
			nodes {
				id
				name
				emoji
			}
		}
	}
`)

type Props = {
	isMobile?: boolean
} & EntityOptionProps

export default function LibrarySideBarSection({
	isMobile,
	links = [FilterableArrangementEntityLink.Create],
}: Props) {
	const location = useLocation()
	const paths = usePaths()

	const { t } = useLocaleContext()
	const { sdk } = useSDK()
	const {
		data: {
			libraries: { nodes: libraries },
		},
	} = useSuspenseGraphQL(query, sdk.cacheKey('libraries'))

	const { checkPermission } = useAppContext()

	const prefetchSeries = usePrefetchLibrarySeries()

	const isCurrentLibrary = (id: string) => location.pathname.startsWith(paths.librarySeries(id))

	const canCreateLibrary = useMemo(
		() => checkPermission(UserPermission.CreateLibrary),
		[checkPermission],
	)
	const showCreateLink = canCreateLibrary && links.includes(FilterableArrangementEntityLink.Create)

	const renderLibraries = () => {
		if (!libraries || !libraries.length) {
			return (
				<Text className="select-none px-1 py-2" variant="muted" size="sm">
					{t('sidebar.buttons.noLibraries')}
				</Text>
			)
		}

		return libraries.map((library) => {
			const canChange = checkPermission(UserPermission.ManageLibrary) && !isMobile
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
					to={paths.librarySeries(library.id, 1)}
					isActive={isCurrentLibrary(library.id)}
					className="pl-2 pr-0"
					leftContent={canChange ? leftContent : undefined}
					rightContent={<LibraryOptionsMenu library={library} />}
					onMouseEnter={() => prefetchSeries(library.id)}
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
					{links.includes(FilterableArrangementEntityLink.ShowAll) && (
						<SideBarButtonLink
							to={paths.libraries()}
							isActive={location.pathname === paths.libraries()}
							variant="action"
						>
							{t('sidebar.buttons.seeAll')}
						</SideBarButtonLink>
					)}
					<div className="ml-2 space-y-1 border-l border-l-edge pl-1">{renderLibraries()}</div>
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
