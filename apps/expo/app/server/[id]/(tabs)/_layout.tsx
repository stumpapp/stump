import { useAuthQuery, useClientContext, useSDK } from '@stump/client'
import { UserPermission } from '@stump/graphql'
import { isAxiosError } from 'axios'
import { NativeTabs } from 'expo-router/unstable-native-tabs'
import { useEffect } from 'react'

import { useStumpServer } from '~/components/activeServer'
import { ServerErrorBoundary } from '~/components/error'
import { useColors } from '~/lib/constants'
import { useAutoSyncActiveServer } from '~/lib/hooks'
import { usePreferencesStore, useUserStore } from '~/stores'

export default function TabLayout() {
	const { sdk } = useSDK()

	const colors = useColors()
	const setUser = useUserStore((state) => state.setUser)
	const autoSyncEnabled = usePreferencesStore((state) => state.autoSyncLocalData)
	const bookClubsEnabled = usePreferencesStore((state) => state.bookClubsEnabled)

	useAutoSyncActiveServer({
		enabled: !!sdk.token && autoSyncEnabled,
	})

	const { onUnauthenticatedResponse } = useClientContext()

	const { checkPermission } = useStumpServer()

	const { user, error } = useAuthQuery({
		enabled: !!sdk.token,
		throwOnError: false,
	})

	useEffect(() => {
		setUser(user)
	}, [user, setUser])

	useEffect(() => {
		if (isAxiosError(error)) {
			if (error.response?.status === 401) {
				onUnauthenticatedResponse?.()
			} else if (error.response?.status === 405) {
				// This can happen if the client is "newer" than the server and is trying to use an endpoint that doesn't exist.
				// We should probably inform the user that they need to update their server.
				// For now, throw to trigger the error boundary
				throw new Error('Incompatible server', { cause: error })
			}
		} else if (error?.message === 'Malformed response received from server') {
			throw new Error('Incompatible server', { cause: error })
		}
	}, [error, onUnauthenticatedResponse])

	const showClubs = bookClubsEnabled && checkPermission(UserPermission.AccessBookClub)

	if (!sdk.token || !user) {
		return null
	}

	return (
		<NativeTabs
			minimizeBehavior="onScrollDown"
			tintColor={colors.fill.brand.DEFAULT}
			backgroundColor={colors.tabbar}
			rippleColor={colors.fill.brand.secondary}
			indicatorColor={colors.fill.brand.secondary}
			labelVisibilityMode="labeled"
		>
			<NativeTabs.Trigger name="index">
				<NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
				<NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
			</NativeTabs.Trigger>
			<NativeTabs.Trigger name="browse">
				<NativeTabs.Trigger.Label>Browse</NativeTabs.Trigger.Label>
				<NativeTabs.Trigger.Icon sf="books.vertical.fill" md="explore" />
			</NativeTabs.Trigger>
			{showClubs && (
				<NativeTabs.Trigger name="clubs">
					<NativeTabs.Trigger.Label>Clubs</NativeTabs.Trigger.Label>
					<NativeTabs.Trigger.Icon sf="square.grid.2x2.fill" md="groups" />
				</NativeTabs.Trigger>
			)}
			<NativeTabs.Trigger name="search" role="search">
				<NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
				<NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
			</NativeTabs.Trigger>
		</NativeTabs>
	)
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
	return <ServerErrorBoundary error={error} onRetry={() => retry()} />
}
