import { AppPropsContext } from '@stump/client'
import { NativeSelect, Tabs } from '@stump/components'
import { User } from '@stump/types'
import { useContext, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

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
	const navigate = useNavigate()
	const appProps = useContext(AppPropsContext)
	const location = useLocation()

	const { t } = useLocaleContext()

	const tabs = useMemo(() => {
		let base = DEFAULT_PAGES

		if (appProps?.platform !== 'browser') {
			// Desktop page is only available on desktop app
			base = [...base.slice(0, 1), DESKTOP_PAGE, ...base.slice(1)]
		}

		if (user?.role !== 'SERVER_OWNER') {
			// Remove all pages except general and desktop for base users
			base = base.filter((page) => page.shortName === 'general' || page.shortName === 'desktop')
		}

		return base.map((page, i) => ({ ...page, index: i }))
	}, [appProps?.platform, user?.role])

	return (
		<SceneContainer className="pb-0">
			{tabs.length > 1 && (
				<NativeSelect
					className="md:hidden"
					options={tabs.map((tab) => ({
						label: t(tab.localeKey),
						value: tab.path,
					}))}
					value={location.pathname}
					onChange={(e) => {
						navigate(e.target.value)
					}}
				/>
			)}

			<Tabs
				value={location.pathname}
				variant="primary"
				activeOnHover
				className="hidden md:inline-flex"
			>
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
