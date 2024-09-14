import { checkUrl, formatServiceURL } from '@stump/api'
import { QueryClientContext, useLogout } from '@stump/client'
import { Card, Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { SavedServer } from '@stump/types'
import { useQueries } from '@tanstack/react-query'
import React, { useCallback, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { useAppStore, useTauriStore, useUserStore } from '@/stores'

import AddServerModal from './AddServerModal'
import ConfiguredServer from './ConfiguredServer'
import DeleteServerConfirmation from './DeleteServerConfirmation'
import EditServerModal from './EditServerModal'
import ResetConfiguredServersSection from './ResetConfiguredServersSection'
import SwitchToServerConfirmation from './SwitchToServerConfirmation'

const PING_HEALTHY_INTERVAL_MS = 10000
const PING_UNHEALTHY_INTERVAL_MS = 2000

export default function ConfiguredServersSection() {
	const location = useLocation()
	const navigate = useNavigate()

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

	const setBaseURL = useAppStore((state) => state.setBaseUrl)
	const setUser = useUserStore((state) => state.setUser)
	const { logout } = useLogout({
		removeStoreUser: () => setUser(null),
	})

	const [editingServer, setEditingServer] = useState<SavedServer | null>(null)
	const [deletingServer, setDeletingServer] = useState<SavedServer | null>(null)
	const [switchingServer, setSwitchingServer] = useState<SavedServer | null>(null)

	const serverStatuses = useQueries({
		context: QueryClientContext,
		queries: connected_servers.map((server) => ({
			queryFn: async () => ({
				name: server.name,
				status: await checkUrl(formatServiceURL(server.uri), 'v1'),
			}),
			queryKey: ['ping', server.uri, server.name],
			// @ts-expect-error: not sure what is wrong here
			refetchInterval: (status) => (status ? PING_HEALTHY_INTERVAL_MS : PING_UNHEALTHY_INTERVAL_MS),
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
		},
		[addServer],
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
		await logout()
		navigate('/auth')
	}, [resetStore, logout, navigate])
	/**
	 * A callback to switch to a server in the list of connected servers, which will
	 * logout the user and redirect them to the auth page to authenticate with the selected
	 * server.
	 */
	const onSwitchToServer = useCallback(async () => {
		if (switchingServer) {
			const returnTo = location.pathname
			await logout()
			await setActiveServer(switchingServer.name)
			navigate('/auth', { state: { from: returnTo } })
		}
	}, [switchingServer, setActiveServer, logout, location.pathname, navigate])

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
				<div className="flex items-end justify-between">
					<div>
						<Heading size="sm">{t(getKey('label'))}</Heading>
						<Text variant="muted" size="sm">
							{t(getKey('description'))}
						</Text>
					</div>

					<AddServerModal existingServers={connected_servers} onCreateServer={onCreateServer} />
				</div>

				<Card className="flex flex-col divide-y divide-edge bg-background-surface">
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

				<ResetConfiguredServersSection onConfirmReset={onDeleteAllServers} />
			</div>
		</>
	)
}

const LOCALE_KEY = 'settingsScene.app/desktop.sections.configuredServers'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
