import { lazy } from 'react'
import { Route, Routes } from 'react-router'

import { AppLayout } from './AppLayout.tsx'
import { RouterProvider } from './context/RouterContext.tsx'
import { BookRouter } from './scenes/book'
import { BookClubRouter } from './scenes/bookClub'
import { LibraryRouter } from './scenes/library'
import { SeriesRouter } from './scenes/series'
import { SettingsRouter } from './scenes/settings'
import { SmartListRouter } from './scenes/smartList'
import { useAppStore } from './stores'

const HomeScene = lazy(() => import('./scenes/home'))
const FourOhFour = lazy(() => import('./scenes/error/FourOhFour.tsx'))
const ServerConnectionErrorScene = lazy(
	() => import('./scenes/error/ServerConnectionErrorScene.tsx'),
)
const LoginOrClaimScene = lazy(() => import('./scenes/auth'))

type AppRouterProps = {
	basePath?: string
}

export function AppRouter({ basePath }: AppRouterProps = {}) {
	const baseUrl = useAppStore((state) => state.baseUrl)

	if (!baseUrl) {
		throw new Error('Base URL is not set')
	}

	// TODO(ux):
	// - explore needs to either go away or transform into some kind of suggestion system
	//    - e.g., explore most commonly-read genres, least-common, recently added, old-but-unread,
	//      popular for other users on server (who opt in to sharing), etc
	//    - basically looking at https://dribbble.com/shots/23501959-Goodreads-Redesign-Interface
	//    - i imagine this could eventually be customizable
	// - dedicated books/series/libraries pages, the former-two being basically what exists today for explore
	// - root-level reading timeline
	// - root-level stats? could also have a home section for stats, with a few aggregates?
	// - root-level authors, once i revisit proper author tracking via db table(s)
	return (
		<RouterProvider basePath={basePath}>
			<Routes>
				<Route path="/" element={<AppLayout />}>
					<Route path="" element={<HomeScene />} />
					<Route path="libraries/*" element={<LibraryRouter />} />
					<Route path="series/*" element={<SeriesRouter />} />
					<Route path="books/*" element={<BookRouter />} />
					<Route path="clubs/*" element={<BookClubRouter />} />
					<Route path="/smart-lists/*" element={<SmartListRouter />} />
					<Route path="settings/*" element={<SettingsRouter />} />
				</Route>

				<Route path="/auth" element={<LoginOrClaimScene />} />
				<Route path="/server-connection-error" element={<ServerConnectionErrorScene />} />
				<Route path="*" element={<FourOhFour />} />
			</Routes>
		</RouterProvider>
	)
}
