import { useMemo } from 'react'

import { EntitySettingsSidebar } from '@/components/sharedLayout'
import { usePaths } from '@/paths'

import { useSmartListContext } from '../context'
import { createRouteGroups } from './routes'

export default function SmartListSettingsSideBar() {
	const paths = usePaths()
	const { list, viewerRole } = useSmartListContext()
	const groups = useMemo(() => createRouteGroups(list.id, viewerRole), [list.id, viewerRole])

	return (
		<EntitySettingsSidebar
			localeBase="smartListSettingsScene"
			groups={groups}
			backlink={{ to: paths.smartListItems(list.id), label: list.name }}
		/>
	)
}
