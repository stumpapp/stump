import { useAppStore } from '@stump/browser/stores'
import { Card, cn, Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { checkUrl, formatApiURL } from '@stump/sdk'
import { useQueries } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import AddServerModal from './components/AddServerModal'
import ConfiguredServer from './components/ConfiguredServer'
import DeleteServerConfirmation from './components/DeleteServerConfirmation'
import RemoveAllTokensSection from './components/RemoveAllTokensSection'
import { SavedServer, useSavedServers } from './stores/savedServer'

const PING_HEALTHY_INTERVAL_MS = 10_000
const PING_UNHEALTHY_INTERVAL_MS = 2000

type PingResult = {
	name: string
	status: boolean
}

export default function Home() {
	const { t } = useLocaleContext()
	const { savedServers, createServer, deleteServer, deleteServerToken } = useSavedServers()

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
			// refetchInterval: (query: Query<unknown, Error, unknown, readonly unknown[]>) => number | false | undefined
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

	return (
		<>
			<DeleteServerConfirmation
				isOpen={!!deletingServer}
				onClose={() => setDeletingServer(null)}
				onConfirm={onDeleteServer}
				isLastServer={savedServers.length === 1}
			/>
			<div
				data-tauri-drag-region
				className="flex h-screen w-screen items-center bg-background py-6"
			>
				<div className="mx-auto flex h-full w-full max-w-sm flex-col justify-center gap-6 sm:max-w-md md:max-w-xl">
					<div className="flex flex-col gap-y-6">
						<div className="flex items-end justify-between">
							<div>
								<Heading size="sm">{t(getKey('label'))}</Heading>
								<Text variant="muted" size="sm">
									{t(getKey('description'))}
								</Text>
							</div>

							<AddServerModal existingServers={savedServers} onCreateServer={createServer} />
						</div>

						{!savedServers.length && (
							<div className="select-none rounded-lg border border-dashed border-edge-subtle p-4 text-foreground-muted">
								{t(getKey('getStarted'))}
							</div>
						)}

						{savedServers.length > 0 && (
							<Card className="flex flex-col divide-y divide-edge bg-background-surface">
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
							</Card>
						)}

						<div
							className={cn('flex flex-col gap-y-6', {
								'pointer-events-none opacity-50': savedServers.length === 0,
							})}
						>
							<RemoveAllTokensSection onConfirmClear={onClearTokens} />
							{/* <RemoveAllTokensSection onConfirmClear={onClearTokens} />
				<ResetConfiguredServersSection onConfirmReset={onDeleteAllServers} /> */}
						</div>
					</div>
				</div>
			</div>
		</>
	)
}

const LOCALE_KEY = 'settingsScene.app/desktop.sections.configuredServers'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
