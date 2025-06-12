import {
	useSmartListViewsManager,
	useSmartListWithMetaQuery,
	useUpdateSmartList,
} from '@stump/client'
import { cn } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { AccessRole, SmartList, SmartListView } from '@stump/sdk'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Outlet, useLocation, useParams } from 'react-router'
import { useMediaMatch } from 'rooks'

import { SceneContainer } from '@/components/container'
import { GenericSettingsHeader } from '@/components/settings'
import { useAppContext } from '@/context'
import { usePreferences } from '@/hooks/usePreferences'

import { defaultWorkingView, SmartListContext, WorkingView } from './context'
import { createRouteGroups } from './settings/routes'
import SmartListSettingsSideBar from './settings/SmartListSettingsSideBar'
import UserSmartListHeader from './UserSmartListHeader'
import UserSmartListNavigation from './UserSmartListNavigation'

const LOCALE_BASE_KEY = 'userSmartListScene.layout'
const withLocaleKey = (key: string) => `${LOCALE_BASE_KEY}.${key}`

export default function UserSmartListLayout() {
	const location = useLocation()

	const { id } = useParams<{ id: string }>()
	const { t } = useLocaleContext()

	// TODO: I don't think I need both TBH, esp with how many more features I can add to the table...
	const [layout, setLayout] = useState<'table' | 'list'>(() => getDefaultLayout())
	const [selectedView, setSelectedView] = useState<SmartListView>()
	const [workingView, setWorkingView] = useState<WorkingView>()

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

	useEffect(() => {
		localStorage.setItem(LAYOUT_PREFERENCE_KEY, layout)
	}, [layout])

	/**
	 * An effect to update the working view whenever the selected view changes
	 */
	useEffect(() => {
		setWorkingView(selectedView)
	}, [selectedView])

	if (!id) {
		throw new Error(t(withLocaleKey('missingIdError')))
	}

	const {
		list,
		meta,
		listQuery: { isLoading: isLoadingList },
	} = useSmartListWithMetaQuery({
		id,
		params: {
			load_views: true,
		},
	})
	const { updateAsync } = useUpdateSmartList({ id })
	const { createView, updateView } = useSmartListViewsManager({ listId: id })
	const { user } = useAppContext()

	/**
	 * Whether or not the current user is the creator of the smart list
	 */
	const isCreator = useMemo(
		() => !!list?.creator_id && list?.creator_id === user.id,
		[user.id, list?.creator_id],
	)

	/**
	 * The access role of the current user for this smart list. This is used to determine
	 * what actions the user can take on the list
	 *
	 * TODO: Support actual roles from the backend, i.e. Writer, CoCreator, Creator, Reader
	 */
	const viewerRole = useMemo<AccessRole>(
		() => (isCreator || user.isServerOwner ? 'CoCreator' : 'Reader'),
		[isCreator, user.isServerOwner],
	)

	const patchSmartList = useCallback(
		async (updates: Partial<SmartList>) => {
			if (list) {
				await updateAsync({ ...list, ...updates })
			}
		},
		[list, updateAsync],
	)

	/**
	 * A function to update the local working view state without storing it in the DB
	 */
	const updateWorkingView = useCallback((updates: Partial<WorkingView>) => {
		setWorkingView((workingView) => {
			const tentative = {
				...(workingView ?? defaultWorkingView),
				...updates,
			}

			const isDefault = Object.keys(tentative).every((key) => {
				const tentativeValue = tentative[key as keyof WorkingView]
				const defaultValue = defaultWorkingView[key as keyof WorkingView]

				return (!tentativeValue && !defaultValue) || tentativeValue === defaultValue
			})

			return isDefault ? undefined : tentative
		})
	}, [])

	/**
	 * A function to store the current working view as a new, stored view in the DB
	 */
	const saveWorkingView = useCallback(
		async (name: string) => {
			if (!workingView || !list?.id) {
				return
			}

			try {
				const createdView = await createView({
					name,
					...workingView,
				})
				setSelectedView(createdView)
			} catch (error) {
				console.error(error)
				const prefix = t(withLocaleKey('viewCreateError'))
				if (error instanceof Error) {
					toast.error(`${prefix}${error.message ? `: ${error.message}` : ''}`)
				} else {
					toast.error(`${prefix}`)
				}
			}
		},
		[workingView, list?.id, createView, t],
	)

	/**
	 * A function to update the currently selected stored view with the current working view changes
	 */
	const saveSelectedStoredView = useCallback(
		async (newName?: string) => {
			if (!selectedView || !workingView) {
				return
			}

			try {
				const updatedView = await updateView({
					originalName: selectedView.name,
					...selectedView,
					...workingView,
					...(newName ? { name: newName } : {}),
				})
				setSelectedView(updatedView)
			} catch (error) {
				console.error(error)
				const prefix = t(withLocaleKey('viewSaveError'))
				if (error instanceof Error) {
					toast.error(`${prefix}${error.message ? `: ${error.message}` : ''}`)
				} else {
					toast.error(`${prefix}`)
				}
			}
		},
		[selectedView, workingView, updateView, t],
	)

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

	if (isLoadingList) {
		return null
	}

	// TODO: redirect for these?
	if (!list) {
		throw new Error(t(withLocaleKey('smartListNotFound')))
	}

	return (
		<SmartListContext.Provider
			value={{
				layout,
				list,
				meta,
				patchSmartList,
				saveSelectedStoredView,
				saveWorkingView,
				selectStoredView: setSelectedView,
				selectedView,
				setLayout,
				updateWorkingView,
				viewerRole,
				workingView,
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
	)
}

const LAYOUT_PREFERENCE_KEY = 'smart-list-layout'

const isLayoutPreference = (value: string): value is 'table' | 'list' =>
	value === 'table' || value === 'list'
const getDefaultLayout = () => {
	const storedLayout = localStorage.getItem(LAYOUT_PREFERENCE_KEY)
	if (storedLayout && isLayoutPreference(storedLayout)) {
		return storedLayout
	}

	return 'table'
}
