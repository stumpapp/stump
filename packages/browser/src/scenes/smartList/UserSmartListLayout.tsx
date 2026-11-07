import { cn } from '@stump/components'
import { AccessRole } from '@stump/graphql'
import { Suspense, useMemo, useRef } from 'react'
import { Outlet, useLocation, useParams } from 'react-router'
import { useMediaMatch } from 'rooks'

import { SceneContainer } from '@/components/container'
import { GenericSettingsHeader } from '@/components/settings'
import { usePreferences } from '@/hooks/usePreferences'
import { useTranslate } from '@/hooks/useTranslate'

import { SmartListContext } from './context'
import { useSmartListById, useSmartListMeta, useUpdateSmartList } from './graphql'
import { createRouteGroups } from './settings/routes'
import SmartListSettingsSideBar from './settings/SmartListSettingsSideBar'
import { createSmartListViewStore, SmartListViewStoreContext } from './store'
import UserSmartListHeader from './UserSmartListHeader'

const LOCALE_BASE_KEY = 'userSmartListScene.layout'
const withLocaleKey = (key: string) => `${LOCALE_BASE_KEY}.${key}`

export default function UserSmartListLayout() {
	const location = useLocation()

	const { id } = useParams<{ id: string }>()
	const { t } = useTranslate()

	const {
		preferences: { enableHideScrollbar },
	} = usePreferences()

	const isSettings = useMemo(() => location.pathname.includes('settings'), [location.pathname])
	const isMobile = useMediaMatch('(max-width: 768px)')

	const displaySideBar = !isMobile && isSettings

	if (!id) {
		throw new Error(t(withLocaleKey('missingIdError')))
	}

	const { list, isLoading: isLoadingList } = useSmartListById({ id })
	const { meta, isLoading: isLoadingMeta } = useSmartListMeta({ id })

	const { update: updateSmartList } = useUpdateSmartList({
		id,
		list,
	})

	const viewerRole = list?.viewerRole ?? AccessRole.Reader
	// ^ the fallback is realistically fine, since they wouldn't otherwise
	// have access to the node if not at least reader

	// eslint-disable-next-line react-hooks/refs
	const store = useRef(
		createSmartListViewStore({
			defaultGrouping: list?.defaultGrouping,
		}),
	).current

	const renderHeader = () =>
		isSettings ? (
			<GenericSettingsHeader
				localeBase="smartListSettingsScene"
				routeGroups={createRouteGroups(list?.id ?? '', viewerRole)}
				entityName={list?.name}
			/>
		) : (
			<UserSmartListHeader />
		)

	if (isLoadingList || isLoadingMeta) {
		return null
	}

	if (!list || !meta || !viewerRole) {
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
				<div className="relative flex flex-1">
					{displaySideBar && <SmartListSettingsSideBar />}

					<div className="min-w-0 flex flex-1 flex-col">
						{renderHeader()}

						<SceneContainer
							className={cn('gap-4 md:pb-0 relative flex flex-1 flex-col', {
								'md:hide-scrollbar': !!enableHideScrollbar,
								'p-0': !isSettings,
							})}
						>
							<Suspense fallback={null}>
								<Outlet />
							</Suspense>
						</SceneContainer>
					</div>
				</div>
			</SmartListContext.Provider>
		</SmartListViewStoreContext.Provider>
	)
}
