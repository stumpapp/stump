import { Card, Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { SavedServer } from '@stump/types'
import React, { useCallback, useState } from 'react'

import { useTauriStore } from '@/stores'

import ConfiguredServer from './ConfiguredServer'

export default function ConfiguredServersSection() {
	const { t } = useLocaleContext()
	const { connected_servers, active_server, editServer, removeServer } = useTauriStore()

	const [editingServer, setEditingServer] = useState<SavedServer | null>(null)
	const [deletingServer, setDeletingServer] = useState<SavedServer | null>(null)

	/**
	 * A callback to edit a server in the list of connected servers
	 */
	const onEditServer = useCallback(
		async (updates: SavedServer) => {
			if (editingServer) {
				await editServer(editingServer.name, updates)
				setEditingServer(null)
			}
		},
		[editingServer, editServer],
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

	// TODO(desktop): Implement server editing and deletion
	return (
		<div className="flex flex-col gap-y-4">
			<div>
				<Heading size="sm">{t(getKey('label'))}</Heading>
				<Text variant="muted" size="sm">
					{t(getKey('description'))}
				</Text>
			</div>

			<Card className="flex flex-col bg-background-surface p-4">
				{connected_servers.map((server) => (
					<ConfiguredServer
						key={`configured-server-${server.name}_${server.uri}`}
						server={server}
						isActive={server.name === active_server?.name}
						onEdit={() => setEditingServer(server)}
						onDelete={() => setDeletingServer(server)}
					/>
				))}
			</Card>
		</div>
	)
}

const LOCALE_KEY = 'settingsScene.app/desktop.sections.configuredServers'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
