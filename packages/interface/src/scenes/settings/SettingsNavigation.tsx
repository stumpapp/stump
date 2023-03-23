// import { Box, Tab, TabList, Tabs } from '@chakra-ui/react'
import { AppPropsContext } from '@stump/client'
import { Tabs } from '@stump/components'
import { User } from '@stump/types'
import { Suspense, useContext, useMemo } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'

import SceneContainer from '../../components/SceneContainer'
import { useLocaleContext } from '../../i18n/context'

const DEFAULT_PAGES = [
	{
		localeKey: 'settingsScene.navigation.general',
		path: '/settings/general',
		shortName: 'general',
	},
	{
		localeKey: 'settingsScene.navigation.users',
		path: '/settings/users',
		shortName: 'users',
	},
	{
		localeKey: 'settingsScene.navigation.server',
		path: '/settings/server',
		shortName: 'server',
	},
	{
		localeKey: 'settingsScene.navigation.jobs',
		path: '/settings/jobs',
		shortName: 'jobs',
	},
]

const DESKTOP_PAGE = {
	localeKey: 'settingsScene.navigation.desktop',
	path: '/settings/desktop',
	shortName: 'desktop',
}

type Props = {
	user?: User | null
}

// TODO: mobile looks bad, use select instead when on mobile
export default function SettingsNavigation({ user }: Props) {
	const appProps = useContext(AppPropsContext)
	const location = useLocation()

	const { t } = useLocaleContext()

	// function handleChange(index: number) {
	// 	const page = pages.find((p) => p.index === index)

	// 	if (page && index !== activeTab) {
	// 		navigate(`/settings/${page.shortName}`)
	// 	}
	// }

	const tabs = useMemo(() => {
		let base = DEFAULT_PAGES

		if (appProps?.platform !== 'browser') {
			base = [...base.slice(0, 1), DESKTOP_PAGE, ...base.slice(1)]
		}

		if (user?.role !== 'SERVER_OWNER') {
			base = base.filter((page) => page.shortName === 'general' || page.shortName === 'desktop')
		}

		return base.map((page, i) => ({ ...page, index: i }))
	}, [appProps?.platform, user?.role])

	return (
		<SceneContainer className="pb-0">
			<Tabs value={location.pathname} variant="primary" activeOnHover>
				<Tabs.List>
					{tabs.map((tab) => (
						<Tabs.Trigger key={tab.path} value={tab.path} asChild>
							<Link to={tab.path}>{t(tab.localeKey)}</Link>
						</Tabs.Trigger>
					))}
				</Tabs.List>
			</Tabs>
		</SceneContainer>
	)
}
