import { Users } from 'lucide-react'
import { useMemo } from 'react'
import { useLocation } from 'react-router'

import { useBookClubContext } from '@/components/bookClub'
import { EntityHeader } from '@/components/sharedLayout'
import { useTranslate } from '@/hooks/useTranslate'
import { usePaths } from '@/paths'

export default function BookClubHeader() {
	const location = useLocation()
	const paths = usePaths()
	const { t, translate } = useTranslate()
	const {
		viewerIsMember,
		bookClub: { name, slug, membersCount },
	} = useBookClubContext()

	const tabs = useMemo(
		() => [
			{
				isActive: !!location.pathname.match(/\/clubs\/[^/]+\/?(home)?$/),
				label: 'Home',
				to: paths.bookClub(slug),
			},
			...(viewerIsMember
				? [
						{
							isActive: !!location.pathname.match(/\/clubs\/[^/]+\/discussion(\/.*)?$/),
							label: 'Discussion',
							// onHover: () => prefetch(),
							to: paths.bookClub(slug, 'discussion'),
						} as const,
						{
							isActive: !!location.pathname.match(/\/clubs\/[^/]+\/members(\/.*)?$/),
							label: 'Members',
							to: paths.bookClub(slug, 'members'),
						} as const,
					]
				: []),
		],
		[location, viewerIsMember, slug, paths],
	)

	const stats = [
		{
			key: 'membersCount',
			icon: Users,
			value: membersCount,
			suffix: translate('shared.common.members', { count: membersCount }),
		},
	]

	return (
		<EntityHeader
			name={name}
			parents={[{ label: t('sidebar.buttons.bookClubs'), to: paths.bookClubs() }]}
			tabs={tabs}
			stats={stats}
			settingsLink={viewerIsMember ? paths.bookClub(slug, 'settings') : undefined}
		/>
	)
}
