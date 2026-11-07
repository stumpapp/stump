import { EntitySettingsSidebar } from '@/components/sharedLayout'
import { useRouterContext } from '@/context/RouterContext'
import { useRouteGroups } from '@/hooks/useRouteGroups'
import { usePaths } from '@/paths'

import { useLibraryContext } from '../../../../components/library/context'
import { createRouteGroups } from './routes'

export default function LibrarySettingsSidebar() {
	const paths = usePaths()
	const { library } = useLibraryContext()
	const { basePath } = useRouterContext()
	const { groups } = useRouteGroups({ routeGroups: createRouteGroups(library.id, basePath) })

	return (
		<EntitySettingsSidebar
			localeBase="librarySettingsScene"
			groups={groups}
			backlink={{ to: paths.libraryBooks(library.id), label: library.name }}
		/>
	)
}
