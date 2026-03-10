import { useAuthQuery, useClientContext, useSDK } from '@stump/client'
import { UserPermission } from '@stump/graphql'
import { isAxiosError } from 'axios'
import { Tabs } from 'expo-router'
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs'
import { Home, Search, SquareLibrary, Users } from 'lucide-react-native'
import { useEffect } from 'react'
import { Platform } from 'react-native'

import { useStumpServer } from '~/components/activeServer'
import { ServerErrorBoundary } from '~/components/error'
import { Icon as JSIcon } from '~/components/ui'
import { useColors } from '~/lib/constants'
import { useAutoSyncActiveServer } from '~/lib/hooks'
import { cn } from '~/lib/utils'
import { usePreferencesStore, useUserStore } from '~/stores'

export default function TabLayout() {
	const { sdk } = useSDK()

	const colors = useColors()
	const accentColor = usePreferencesStore((state) => state.accentColor)
	const animationEnabled = usePreferencesStore((state) => !state.reduceAnimations)
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

	return Platform.select({
		ios: (
			<NativeTabs
				tintColor={accentColor || colors.fill.brand.DEFAULT}
				minimizeBehavior="onScrollDown"
			>
				<NativeTabs.Trigger name="index">
					<Label>Home</Label>
					<Icon
						sf={{ default: 'house', selected: 'house.fill' }}
						drawable="custom_android_drawable"
					/>
				</NativeTabs.Trigger>
				<NativeTabs.Trigger name="browse">
					<Label>Browse</Label>
					<Icon sf="books.vertical.fill" drawable="custom_android_drawable" />
				</NativeTabs.Trigger>
				{showClubs && (
					<NativeTabs.Trigger name="clubs">
						<Label>Clubs</Label>
						<Icon sf="square.grid.2x2.fill" drawable="custom_android_drawable" />
					</NativeTabs.Trigger>
				)}
				<NativeTabs.Trigger name="search" role="search">
					<Label>Search</Label>
					<Icon sf="magnifyingglass" drawable="custom_android_drawable" />
				</NativeTabs.Trigger>
			</NativeTabs>
		),

		android: (
			<Tabs
				screenOptions={{
					tabBarActiveTintColor: colors.foreground.DEFAULT,
					animation: animationEnabled ? undefined : 'none',
				}}
			>
				<Tabs.Screen
					name="index"
					options={{
						title: 'Home',
						tabBarIcon: ({ focused }) => (
							<JSIcon
								as={Home}
								className={cn('h-6 w-6 text-foreground-muted', { 'text-foreground': focused })}
							/>
						),
						headerShown: false,
					}}
				/>

				<Tabs.Screen
					name="browse"
					options={{
						title: 'Browse',
						tabBarIcon: ({ focused }) => (
							<JSIcon
								as={SquareLibrary}
								className={cn('h-6 w-6 text-foreground-muted', { 'text-foreground': focused })}
							/>
						),
						headerShown: false,
					}}
				/>

				{showClubs && (
					<Tabs.Screen
						name="clubs"
						options={{
							title: 'Clubs',
							tabBarIcon: ({ focused }) => (
								<JSIcon
									as={Users}
									className={cn('h-6 w-6 text-foreground-muted', { 'text-foreground': focused })}
								/>
							),
							headerShown: false,
						}}
					/>
				)}

				<Tabs.Screen
					name="search"
					options={{
						headerShown: false,
						title: 'Search',
						tabBarIcon: ({ focused }) => (
							<JSIcon
								as={Search}
								className={cn('h-6 w-6 text-foreground-muted', { 'text-foreground': focused })}
							/>
						),
					}}
				/>
			</Tabs>
		),
	})
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
	return <ServerErrorBoundary error={error} onRetry={() => retry()} />
}
