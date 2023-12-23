import { AppPropsContext } from '@stump/client'
import { NativeSelect, Tabs } from '@stump/components'
import { User } from '@stump/types'
import { useContext, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import SceneContainer from '@/components/SceneContainer'

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

/**
 * A component that renders the navigation for the settings scene.
 */
export default function SettingsNavigation({ user }: Props) {
	const navigate = useNavigate()
	const appProps = useContext(AppPropsContext)
	const location = useLocation()

	const { t } = useLocaleContext()

	const activeRoute = useMemo(() => {
		return (
			[...DEFAULT_PAGES, DESKTOP_PAGE].find((page) => location.pathname.startsWith(page.path))
				?.path || ''
		)
	}, [location.pathname])

	const isServerOwner = user?.is_server_owner ?? false
	const tabs = useMemo(() => {
		let base = DEFAULT_PAGES

		if (appProps?.platform !== 'browser') {
			// Desktop page is only available on desktop app
			base = [...base.slice(0, 1), DESKTOP_PAGE, ...base.slice(1)]
		}

		if (!isServerOwner) {
			// Remove all pages except general and desktop for base users
			base = base.filter((page) => page.shortName === 'general' || page.shortName === 'desktop')
		}

		return base.map((page, i) => ({ ...page, index: i }))
	}, [appProps?.platform, isServerOwner])

	if (tabs.length <= 1) {
		// Don't render navigation if there's only one available page,
		// this indicates the user doesn't have access to any other pages and is
		// silly to render a navigation with only one tab
		return null
	}

	return (
		<SceneContainer className="pb-0">
			<NativeSelect
				className="md:hidden"
				options={tabs.map((tab) => ({
					label: t(tab.localeKey),
					value: tab.path,
				}))}
				value={activeRoute}
				onChange={(e) => {
					navigate(e.target.value)
				}}
			/>
			<Tabs value={activeRoute} variant="primary" activeOnHover className="hidden md:inline-flex">
				<Tabs.List>
					{tabs.map((tab) => (
						<Tabs.Trigger key={tab.path} value={tab.path} asChild>
							<Link className="truncate" to={tab.path}>
								{t(tab.localeKey)}
							</Link>
						</Tabs.Trigger>
					))}
				</Tabs.List>
			</Tabs>
		</SceneContainer>
	)
}
