// import { Box, Tab, TabList, Tabs } from '@chakra-ui/react'
import { AppPropsContext } from '@stump/client'
import { Tabs } from '@stump/components'
import { User } from '@stump/types'
import { Suspense, useContext, useMemo } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'

import SceneContainer from '../../components/SceneContainer'

const DEFAULT_PAGES = [
	{
		displayName: 'General',
		path: '/settings/general',
		shortName: 'general',
	},
	{
		displayName: 'Users',
		path: '/settings/users',
		shortName: 'users',
	},
	{
		displayName: 'Server',
		path: '/settings/server',
		shortName: 'server',
	},
	{
		displayName: 'Jobs',
		path: '/settings/jobs',
		shortName: 'jobs',
	},
]

const DESKTOP_PAGE = {
	displayName: 'Desktop',
	path: '/settings/desktop',
	shortName: 'desktop',
}

type Props = {
	user?: User | null
}

export default function SettingsNavigation({ user }: Props) {
	const appProps = useContext(AppPropsContext)
	const navigate = useNavigate()

	const location = useLocation()

	// const pages = useMemo(() => {
	// let base = DEFAULT_PAGES

	// if (appProps?.platform !== 'browser') {
	// 	// insert into 2nd position
	// 	base = [...base.slice(0, 1), DESKTOP_PAGE, ...base.slice(1)]
	// }

	// if (user?.role !== 'SERVER_OWNER') {
	// 	base = base.filter((page) => page.shortName === 'general' || page.shortName === 'desktop')
	// }

	// return base.map((page, i) => ({ ...page, index: i }))
	// }, [appProps?.platform, user?.role])

	// const activeTab = useMemo(
	// 	() => pages.find((p) => p.path === location.pathname)?.index ?? 0,
	// 	[pages, location],
	// )

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
		<SceneContainer>
			<Tabs value={location.pathname} variant="primary">
				<Tabs.List>
					{tabs.map((tab) => (
						<Tabs.Trigger key={tab.path} value={tab.path} asChild>
							<Link to={tab.path}>{tab.displayName}</Link>
						</Tabs.Trigger>
					))}
				</Tabs.List>

				<>
					{tabs.map((tab) => (
						<Tabs.Content key={tab.path} value={tab.path} asChild>
							<Suspense>
								<Outlet />
							</Suspense>
						</Tabs.Content>
					))}
				</>
			</Tabs>
		</SceneContainer>
	)

	// // Note: idk how I feel about this UI...
	// return (
	// 	<Box py={[2, 2, 0]} px={4} w="full">
	// 		<Tabs index={activeTab} onChange={handleChange} colorScheme="brand" w="full">
	// 			<TabList>
	// 				{pages.map((page) => (
	// 					<Tab key={page.path}>{page.displayName}</Tab>
	// 				))}
	// 			</TabList>
	// 		</Tabs>
	// 	</Box>
	// )
}
