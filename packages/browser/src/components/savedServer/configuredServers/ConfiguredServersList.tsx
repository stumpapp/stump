import { QueryClientContext, useLogout } from '@stump/client'
import { Card, cn, Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { checkUrl, formatApiURL } from '@stump/sdk'
import { SavedServer } from '@stump/sdk'
import { useQueries } from '@tanstack/react-query'
import React, { Fragment, PropsWithChildren, useCallback, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { useTauriRPC } from '@/hooks/useTauriRPC'
import { useAppStore, useTauriStore, useUserStore } from '@/stores'

import AddServerModal from './AddServerModal'
import ConfiguredServer from './ConfiguredServer'
import DeleteServerConfirmation from './DeleteServerConfirmation'
import EditServerModal from './EditServerModal'
import RemoveAllTokensSection from './RemoveAllTokensSection'
import ResetConfiguredServersSection from './ResetConfiguredServersSection'
import SwitchToServerConfirmation from './SwitchToServerConfirmation'

const PING_HEALTHY_INTERVAL_MS = 10_000
const PING_UNHEALTHY_INTERVAL_MS = 2000

type PingResult = {
	name: string
	status: boolean
}

export default function ConfiguredServersSection() {
	const location = useLocation()
	const navigate = useNavigate()

	const isOnboarding = location.pathname === '/'

	const { t } = useLocaleContext()
	const {
		connected_servers,
		active_server,
		setActiveServer,
		addServer,
		editServer,
		removeServer,
		resetStore,
	} = useTauriStore()
	const { clearCredentialStore } = useTauriRPC()

	const setBaseURL = useAppStore((state) => state.setBaseUrl)
	const setUser = useUserStore((state) => state.setUser)

	const { logout } = useLogout({
		removeStoreUser: () => setUser(null),
	})
	const safelyLogout = useCallback(async () => {
		try {
			await logout()
		} catch (error) {
			console.error('Error logging out:', error)
		}
	}, [logout])

	const [editingServer, setEditingServer] = useState<SavedServer | null>(null)
	const [deletingServer, setDeletingServer] = useState<SavedServer | null>(null)
	const [switchingServer, setSwitchingServer] = useState<SavedServer | null>(null)

	const serverStatuses = useQueries({
		context: QueryClientContext,
		queries: connected_servers.map((server) => ({
			queryFn: async () =>
				({
					name: server.name,
					status: await checkUrl(formatApiURL(server.uri, 'v1')),
				}) as PingResult,
			queryKey: ['ping', server.uri, server.name],
			refetchInterval: (result?: PingResult) => {
				if (!result) return false
				return result.status ? PING_HEALTHY_INTERVAL_MS : PING_UNHEALTHY_INTERVAL_MS
			},
		})),
	})
	/**
	 * A map of server names to their current status, if available. This is used to display
	 * the current status of each server in the list.
	 */
	const serverStatus = useMemo(
		() =>
			serverStatuses.reduce(
				(acc, { data }) => {
					if (data != undefined) {
						acc[data.name] = data.status
					}
					return acc
				},
				{} as Record<string, boolean>,
			),
		[serverStatuses],
	)

	/**
	 * A callback to create a new server in the list of connected servers. Note that this
	 * will not auto-connect to the server.
	 *
	 * @param server The server to create
	 */
	const onCreateServer = useCallback(
		async (server: SavedServer) => {
			await addServer(server)
			if (isOnboarding) {
				setActiveServer(server.name)
				window.location.href = '/'
			}
		},
		[addServer, setActiveServer, isOnboarding],
	)
	/**
	 * A callback to edit a server in the list of connected servers
	 */
	const onEditServer = useCallback(
		async (updates: SavedServer) => {
			if (editingServer) {
				const swapURL = editingServer.uri !== updates.uri
				await editServer(editingServer.name, updates)
				setEditingServer(null)
				// TODO(desktop): check if re-auth is needed
				if (swapURL) {
					setBaseURL(updates.uri)
				}
			}
		},
		[editingServer, editServer, setBaseURL],
	)
	/**
	 * A callback to delete a server from the list of connected servers
	 */
	const onDeleteServer = useCallback(async () => {
		if (deletingServer) {
			await removeServer(deletingServer.name)
			setDeletingServer(null)
		}
	}, [deletingServer, removeServer])
	/**
	 * A callback to delete all servers from the list of connected servers
	 */
	const onDeleteAllServers = useCallback(async () => {
		await resetStore()
		await safelyLogout()
		navigate('/auth')
	}, [resetStore, safelyLogout, navigate])
	/**
	 * A callback to switch to a server in the list of connected servers, which will
	 * logout the user and redirect them to the auth page to authenticate with the selected
	 * server.
	 */
	const onSwitchToServer = useCallback(async () => {
		if (switchingServer) {
			const returnTo = location.pathname
			await safelyLogout()
			await setActiveServer(switchingServer.name)
			navigate('/auth', { state: { from: returnTo } })
		}
	}, [switchingServer, setActiveServer, safelyLogout, location.pathname, navigate])

	const onClearTokens = useCallback(async () => {
		await clearCredentialStore()
		await safelyLogout()
		navigate('/auth')
	}, [clearCredentialStore, safelyLogout, navigate])

	const renderContent = () => {
		if (isOnboarding && !connected_servers.length) {
			return (
				<div className="p-4 text-foreground-muted">
					TODO: proper onboarding messaging. Click add server
				</div>
			)
		} else {
			const SectionContainer = ({ children }: PropsWithChildren) =>
				isOnboarding ? (
					<div className="flex flex-col gap-y-6 px-4">{children}</div>
				) : (
					<Fragment>{children}</Fragment>
				)

			return (
				<>
					<Card
						className={cn('flex flex-col divide-y divide-edge bg-background-surface', {
							'mx-4': isOnboarding,
						})}
					>
						{connected_servers.map((server) => (
							<ConfiguredServer
								key={`configured-server-${server.name}_${server.uri}`}
								server={server}
								isActive={server.name === active_server?.name}
								onEdit={() => setEditingServer(server)}
								onDelete={() => setDeletingServer(server)}
								onSwitch={() => setSwitchingServer(server)}
								isReachable={serverStatus[server.name]}
							/>
						))}
					</Card>

					<SectionContainer>
						<RemoveAllTokensSection onConfirmClear={onClearTokens} />
						<ResetConfiguredServersSection onConfirmReset={onDeleteAllServers} />
					</SectionContainer>
				</>
			)
		}
	}

	return (
		<>
			<SwitchToServerConfirmation
				server={switchingServer}
				onCancel={() => setSwitchingServer(null)}
				onConfirm={onSwitchToServer}
			/>

			<EditServerModal
				editingServer={editingServer}
				existingServers={connected_servers}
				onEditServer={onEditServer}
				onCancel={() => setEditingServer(null)}
			/>

			<DeleteServerConfirmation
				isOpen={!!deletingServer}
				onClose={() => setDeletingServer(null)}
				onConfirm={onDeleteServer}
				isLastServer={connected_servers.length === 1}
				isActiveServer={deletingServer?.name === active_server?.name}
			/>

			<div className="flex flex-col gap-y-6">
				<div
					className={cn('flex items-end justify-between', {
						'px-4 py-2': isOnboarding,
					})}
				>
					<div>
						<Heading size="sm">{t(getKey('label'))}</Heading>
						<Text variant="muted" size="sm">
							{t(getKey('description'))}
						</Text>
					</div>

					<AddServerModal existingServers={connected_servers} onCreateServer={onCreateServer} />
				</div>

				{renderContent()}
			</div>
		</>
	)
}

const LOCALE_KEY = 'settingsScene.app/desktop.sections.configuredServers'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
