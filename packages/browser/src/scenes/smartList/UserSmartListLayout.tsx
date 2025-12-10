import { cn } from '@stump/components'
import { AccessRole } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { Suspense, useMemo, useRef } from 'react'
import { Outlet, useLocation, useParams } from 'react-router'
import { useMediaMatch } from 'rooks'

import { SceneContainer } from '@/components/container'
import { GenericSettingsHeader } from '@/components/settings'
import { useAppContext } from '@/context'
import { usePreferences } from '@/hooks/usePreferences'

import { SmartListContext } from './context'
import { useSmartListById, useSmartListMeta, useUpdateSmartList } from './graphql'
import { createRouteGroups } from './settings/routes'
import SmartListSettingsSideBar from './settings/SmartListSettingsSideBar'
import { createSmartListViewStore, SmartListViewStoreContext } from './store'
import UserSmartListHeader from './UserSmartListHeader'
import UserSmartListNavigation from './UserSmartListNavigation'

const LOCALE_BASE_KEY = 'userSmartListScene.layout'
const withLocaleKey = (key: string) => `${LOCALE_BASE_KEY}.${key}`

export default function UserSmartListLayout() {
	const location = useLocation()

	const { id } = useParams<{ id: string }>()
	const { t } = useLocaleContext()

	const {
		preferences: {
			enableDoubleSidebar,
			primaryNavigationMode,
			layoutMaxWidthPx,
			enableHideScrollbar,
		},
	} = usePreferences()

	const isSettings = useMemo(() => location.pathname.includes('settings'), [location.pathname])
	const isMobile = useMediaMatch('(max-width: 768px)')

	const displaySideBar = !!enableDoubleSidebar && !isMobile && isSettings
	const preferTopBar = primaryNavigationMode === 'TOPBAR'

	if (!id) {
		throw new Error(t(withLocaleKey('missingIdError')))
	}

	const { list, isLoading: isLoadingList } = useSmartListById({ id })
	const { meta, isLoading: isLoadingMeta } = useSmartListMeta({ id })

	const { update: updateSmartList } = useUpdateSmartList({
		id,
		list,
	})

	const { user } = useAppContext()

	/**
	 * Whether or not the current user is the creator of the smart list
	 */
	const isCreator = useMemo(
		() => !!list?.creatorId && list?.creatorId === user.id,
		[user.id, list?.creatorId],
	)

	/**
	 * The access role of the current user for this smart list. This is used to determine
	 * what actions the user can take on the list
	 *
	 * TODO: Support actual roles from the backend, i.e. Writer, CoCreator, Creator, Reader
	 */
	const viewerRole = useMemo<AccessRole>(
		() => (isCreator || user.isServerOwner ? AccessRole.CoCreator : AccessRole.Reader),
		[isCreator, user.isServerOwner],
	)

	// Create scoped store with default grouping from the list
	const store = useRef(
		createSmartListViewStore({
			defaultGrouping: list?.defaultGrouping,
		}),
	).current

	const renderHeader = () =>
		isSettings ? (
			<GenericSettingsHeader
				localeBase="smartListSettingsScene"
				routeGroups={createRouteGroups(viewerRole)}
			/>
		) : (
			<>
				<UserSmartListHeader />
				<UserSmartListNavigation />
			</>
		)

	if (isLoadingList || isLoadingMeta) {
		return null
	}

	// TODO: redirect for these?
	if (!list || !meta) {
		throw new Error(t(withLocaleKey('smartListNotFound')))
	}

	return (
		<SmartListViewStoreContext.Provider value={store}>
			<SmartListContext.Provider
				value={{
					list,
					meta,
					patchSmartList: updateSmartList,
					viewerRole,
				}}
			>
				<div
					className={cn('relative flex flex-1 flex-col', {
						'mx-auto w-full': preferTopBar && !!layoutMaxWidthPx,
					})}
					style={{
						maxWidth: preferTopBar ? layoutMaxWidthPx || undefined : undefined,
					}}
				>
					{renderHeader()}

					{displaySideBar && <SmartListSettingsSideBar />}

					<SceneContainer
						className={cn('relative flex flex-1 flex-col gap-4 md:pb-0', {
							'md:hide-scrollbar': !!enableHideScrollbar,
							'p-0': !isSettings,
							// pl-48 is for the sidebar, plus pl-4 for the padding
							'pl-52': displaySideBar,
						})}
					>
						<Suspense fallback={null}>
							<Outlet />
						</Suspense>
					</SceneContainer>
				</div>
			</SmartListContext.Provider>
		</SmartListViewStoreContext.Provider>
	)
}
