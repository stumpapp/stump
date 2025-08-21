import { useGraphQLMutation, useSDK } from '@stump/client'
import { cn } from '@stump/components'
import {
	AccessRole,
	CreateSmartListViewMutation,
	Exact,
	graphql,
	SaveSmartListView,
	SmartListView,
	UpdateSmartListViewMutation,
} from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { UseMutateFunction, useQueryClient } from '@tanstack/react-query'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Outlet, useLocation, useParams } from 'react-router'
import { useMediaMatch } from 'rooks'

import { SceneContainer } from '@/components/container'
import { GenericSettingsHeader } from '@/components/settings'
import { useAppContext } from '@/context'
import { usePreferences } from '@/hooks/usePreferences'

import { defaultWorkingView, SmartListContext, WorkingView } from './context'
import { useSmartListById, useSmartListMeta, useUpdateSmartList } from './graphql'
import { createRouteGroups } from './settings/routes'
import SmartListSettingsSideBar from './settings/SmartListSettingsSideBar'
import UserSmartListHeader from './UserSmartListHeader'
import UserSmartListNavigation from './UserSmartListNavigation'

const LOCALE_BASE_KEY = 'userSmartListScene.layout'
const withLocaleKey = (key: string) => `${LOCALE_BASE_KEY}.${key}`

const createMutation = graphql(`
	mutation CreateSmartListView($input: SaveSmartListView!) {
		createSmartListView(input: $input) {
			id
			listId
			name
			bookColumns {
				id
				position
			}
			bookSorting {
				id
				desc
			}
			groupColumns {
				id
				position
			}
			groupSorting {
				id
				desc
			}
		}
	}
`)

const updateMutation = graphql(`
	mutation UpdateSmartListView($originalName: String!, $input: SaveSmartListView!) {
		updateSmartListView(originalName: $originalName, input: $input) {
			id
			listId
			name
			bookColumns {
				id
				position
			}
			bookSorting {
				id
				desc
			}
			groupColumns {
				id
				position
			}
			groupSorting {
				id
				desc
			}
		}
	}
`)

function useSmartListView({ id }: { id?: string }): {
	view?: SmartListView
	setView: (view?: SmartListView) => void
	create: UseMutateFunction<
		CreateSmartListViewMutation,
		unknown,
		Exact<{ input: SaveSmartListView }>,
		unknown
	>
	update: UseMutateFunction<
		UpdateSmartListViewMutation,
		unknown,
		Exact<{ originalName: string; input: SaveSmartListView }>,
		unknown
	>
} {
	const [view, setView] = useState<SmartListView>()
	const client = useQueryClient()
	const { sdk } = useSDK()
	const setViewCallback = useCallback(
		(newView?: SmartListView) => {
			client.invalidateQueries({ queryKey: [sdk.cacheKeys.smartListById, id || ''] })
			client.invalidateQueries({ queryKey: [sdk.cacheKeys.smartListMeta, id || ''] })
			setView(newView)
		},
		[setView, client, id, sdk.cacheKeys],
	)

	const { mutate: create } = useGraphQLMutation(createMutation, {
		mutationKey: [sdk.cacheKeys.smartListViewCreate, id],
		onSuccess: (data) => {
			setViewCallback(data.createSmartListView)
		},
	})
	const { mutate: update } = useGraphQLMutation(updateMutation, {
		mutationKey: [sdk.cacheKeys.smartListViewUpdate, id],
		onSuccess: (data) => {
			setViewCallback(data.updateSmartListView)
		},
	})

	return {
		view,
		setView: setViewCallback,
		create,
		update,
	}
}

export default function UserSmartListLayout() {
	const location = useLocation()

	const { id } = useParams<{ id: string }>()
	const { t } = useLocaleContext()

	// TODO: I don't think I need both TBH, esp with how many more features I can add to the table...
	const [layout, setLayout] = useState<'table' | 'list'>(() => getDefaultLayout())
	const [workingView, setWorkingView] = useState<WorkingView>()
	const {
		view: selectedView,
		setView: setSelectedViewCallback,
		create: createView,
		update: updateView,
	} = useSmartListView({ id })

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

	const { list: list, isLoading: isLoadingList } = useSmartListById({ id })
	const { meta: meta, isLoading: isLoadingMeta } = useSmartListMeta({ id })

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
				createView({
					input: {
						listId: list?.id,
						name,
						...workingView,
					} as SaveSmartListView,
				})
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
				updateView({
					originalName: selectedView.name,
					input: {
						...selectedView,
						...workingView,
						...(newName ? { name: newName } : {}),
					} as SaveSmartListView,
				})
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

	if (isLoadingList || isLoadingMeta) {
		return null
	}

	// TODO: redirect for these?
	if (!list || !meta) {
		throw new Error(t(withLocaleKey('smartListNotFound')))
	}

	return (
		<SmartListContext.Provider
			value={{
				layout,
				// TODO(graphql): Figure out this type error during a cleanup phase of the migration
				// I didn't work directly on this so don't want to get to deep into it
				list,
				meta,
				patchSmartList: updateSmartList,
				saveSelectedStoredView,
				saveWorkingView,
				selectStoredView: setSelectedViewCallback,
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
