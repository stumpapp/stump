import { useAppStore } from '@stump/browser/stores'
import { cn, NewCard, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { checkUrl, formatApiURL } from '@stump/sdk'
import { useQueries } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import AddServerModal from './components/AddServerModal'
import ConfiguredServer from './components/ConfiguredServer'
import DeleteServerConfirmation from './components/DeleteServerConfirmation'
import EditServerModal from './components/EditServerModal'
import RemoveAllTokensSection from './components/RemoveAllTokensSection'
import { CreateServer, SavedServer, useSavedServers } from './stores/savedServer'

const PING_HEALTHY_INTERVAL_MS = 10_000
const PING_UNHEALTHY_INTERVAL_MS = 2000

type PingResult = {
	name: string
	status: boolean
}

export default function Home() {
	const { t } = useLocaleContext()
	const { savedServers, createServer, updateServer, deleteServer, deleteServerToken } =
		useSavedServers()

	const setBaseUrl = useAppStore((store) => store.setBaseUrl)
	const navigate = useNavigate()

	const [editingServer, setEditingServer] = useState<SavedServer | null>(null)
	const [deletingServer, setDeletingServer] = useState<SavedServer | null>(null)

	const statusResults = useQueries({
		// @ts-expect-error: FIXME: Figure out the type issue here
		queries: savedServers.map((server) => ({
			queryFn: async () =>
				({
					name: server.name,
					status: await checkUrl(formatApiURL(server.url, 'v2')),
				}) as PingResult,
			queryKey: ['ping', server.url, server.name],
			refetchInterval: (result?: PingResult) => {
				if (!result) return false
				return result.status ? PING_HEALTHY_INTERVAL_MS : PING_UNHEALTHY_INTERVAL_MS
			},
		})),
	})

	const serverStatuses = useMemo(
		() =>
			statusResults.reduce(
				(acc, { data }) => {
					if (data != undefined) {
						acc[data.name] = data.status
					}
					return acc
				},
				{} as Record<string, boolean>,
			),
		[statusResults],
	)

	/**
	 * A callback to delete a server from the list of connected servers
	 */
	const onDeleteServer = useCallback(async () => {
		if (deletingServer) {
			try {
				await deleteServer(deletingServer.id)
				setDeletingServer(null)
			} catch (error) {
				console.error('Error deleting server:', error)
				toast.error('Error deleting server')
			}
		}
	}, [deletingServer, deleteServer])

	const onEditServer = useCallback(
		async (updates: CreateServer) => {
			if (editingServer) {
				try {
					await updateServer(editingServer.id, updates)
					setEditingServer(null)
				} catch (error) {
					console.error('Error updating server:', error)
					toast.error('Error updating server')
				}
			}
		},
		[editingServer, updateServer],
	)

	const onClearTokens = useCallback(async () => {
		try {
			await Promise.all(savedServers.map((server) => deleteServerToken(server.id)))
		} catch (error) {
			console.error('Error clearing tokens:', error)
			toast.error('Error clearing tokens')
		}
	}, [deleteServerToken, savedServers])

	const onSwitchToServer = useCallback(
		(server: SavedServer) => {
			setBaseUrl(server.url)
			navigate(`/server/${server.id}`)
		},
		[navigate, setBaseUrl],
	)

	// TODO: better empty state
	return (
		<>
			<DeleteServerConfirmation
				isOpen={!!deletingServer}
				onClose={() => setDeletingServer(null)}
				onConfirm={onDeleteServer}
				isLastServer={savedServers.length === 1}
			/>

			<EditServerModal
				editingServer={editingServer}
				existingServers={savedServers}
				onEditServer={onEditServer}
				onCancel={() => setEditingServer(null)}
			/>

			<div className="p-6 gap-3 lg:gap-4 flex flex-col">
				<div className="px-2 gap-4 flex flex-row items-center justify-between">
					<Text className="font-semibold shrink-0 text-foreground">{t(getKey('label'))}</Text>
					<AddServerModal existingServers={savedServers} onCreateServer={createServer} />
				</div>

				{!savedServers.length && (
					<NewCard>
						<p className="px-4 py-8 text-sm text-center text-muted-foreground select-none">
							{t(getKey('getStarted'))}
						</p>
					</NewCard>
				)}

				{savedServers.map((server) => (
					<ConfiguredServer
						key={`configured-server-${server.name}_${server.url}`}
						server={server}
						isActive={false}
						onEdit={() => setEditingServer(server)}
						onDelete={() => setDeletingServer(server)}
						onSwitch={() => onSwitchToServer(server)}
						isReachable={serverStatuses[server.name]}
					/>
				))}

				<div
					className={cn('gap-y-6 flex flex-col', {
						'pointer-events-none opacity-50': savedServers.length === 0,
					})}
				>
					<RemoveAllTokensSection onConfirmClear={onClearTokens} />
				</div>
			</div>
		</>
	)
}

const LOCALE_KEY = 'settingsScene.app/desktop.sections.configuredServers'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
