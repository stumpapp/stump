import ConfiguredServer from '@stump/browser/components/savedServer/configuredServers/ConfiguredServer'
import { useTauriStore } from '@stump/browser/stores'
import { Card, cn, Heading, Text } from '@stump/components'
import { useCallback } from 'react'

import AddServerModal from './components/AddServerModal'

export default function Home() {
	const {
		connectedServers,
		activeServer,
		setActiveServer,
		addServer,
		editServer,
		removeServer,
		resetStore,
	} = useTauriStore()

	const onCreateServer = useCallback(() => {}, [])

	return (
		<div data-tauri-drag-region className="flex h-screen w-screen items-center bg-background py-6">
			<div className="mx-auto flex h-full w-full max-w-sm flex-col justify-start gap-6 sm:max-w-md md:max-w-xl">
				<div className="flex flex-col gap-y-6">
					<div className="flex items-end justify-between">
						<div>
							<Heading size="sm">Configured servers</Heading>
							<Text variant="muted" size="sm">
								The list of Stump servers you can connect to
							</Text>
						</div>

						<AddServerModal existingServers={connectedServers} onCreateServer={onCreateServer} />
					</div>

					{!connectedServers.length && (
						<div className="select-none rounded-lg border border-dashed border-edge-subtle p-4 text-foreground-muted">
							{/* {t(getKey('getStarted'))} */}
							Add a server to get started
						</div>
					)}

					{connectedServers.length > 0 && (
						<Card className="flex flex-col divide-y divide-edge bg-background-surface">
							{connectedServers.map((server) => (
								// <ConfiguredServer
								// 	key={`configured-server-${server.name}_${server.uri}`}
								// 	// server={server}
								// 	// isActive={server.name === activeServer?.name}
								// 	// onEdit={() => setEditingServer(server)}
								// 	// onDelete={() => setDeletingServer(server)}
								// 	// onSwitch={() => setSwitchingServer(server)}
								// 	// isReachable={serverStatus[server.name]}
								// />
								<Card key={`configured-server-${server.name}_${server.uri}`}>
									<Text>{server.name}</Text>
									<Text>{server.uri}</Text>
								</Card>
							))}
						</Card>
					)}

					<div
						className={cn('flex flex-col gap-y-6', {
							'pointer-events-none opacity-50': connectedServers.length === 0,
						})}
					>
						{/* <RemoveAllTokensSection onConfirmClear={onClearTokens} />
				<ResetConfiguredServersSection onConfirmReset={onDeleteAllServers} /> */}
					</div>
				</div>
			</div>
		</div>
	)
}
