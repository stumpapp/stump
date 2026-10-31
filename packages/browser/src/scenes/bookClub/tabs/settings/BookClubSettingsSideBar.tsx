import { useBookClubContext } from '@/components/bookClub'
import { EntitySettingsSidebar } from '@/components/sharedLayout'
import { useRouteGroups } from '@/hooks/useRouteGroups'
import { usePaths } from '@/paths'

import { createRouteGroups } from './routes'

export default function BookClubSettingsSideBar() {
	const paths = usePaths()
	const { bookClub } = useBookClubContext()
	const { groups } = useRouteGroups({ routeGroups: createRouteGroups(bookClub.slug) })

	return (
		<EntitySettingsSidebar
			localeBase="bookClubSettingsScene"
			groups={groups}
			backlink={{ to: paths.bookClub(bookClub.slug), label: bookClub.name }}
		/>
	)
}
