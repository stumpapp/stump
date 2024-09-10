import { IconButton, Text, ToolTip } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { SavedServer } from '@stump/types'
import { BadgeCheck, Power, Settings2, Trash2 } from 'lucide-react'
import React from 'react'

type Props = {
	/**
	 * The server to display
	 */
	server: SavedServer
	/**
	 * Whether the server is currently active (i.e. connected to)
	 */
	isActive: boolean
	/**
	 * A callback to trigger the edit modal to render
	 */
	onEdit: () => void
	/**
	 * A callback to trigger the delete confirmation modal to render
	 */
	onDelete: () => void
	/**
	 * A callback to trigger the switch confirmation modal to render
	 */
	onSwitch: () => void
}

export default function ConfiguredServer({ server, isActive, onEdit, onDelete, onSwitch }: Props) {
	const { t } = useLocaleContext()

	return (
		<div className="group flex items-center justify-between">
			<div className="flex flex-col">
				<span className="flex items-center space-x-2">
					<Text>{server.name}</Text>
					{isActive && (
						<BadgeCheck className="h-4 w-4 text-fill-success text-opacity-75" strokeWidth={0.95} />
					)}
				</span>
				<Text variant="muted" size="sm">
					{server.uri}
				</Text>
			</div>

			<div className="flex items-center space-x-1.5 opacity-90 group-hover:opacity-100">
				{!isActive && (
					<ToolTip content={t(getKey('switchToServer.tooltip'))}>
						<IconButton size="xs" onClick={onSwitch}>
							<Power className="h-4 w-4" />
						</IconButton>
					</ToolTip>
				)}

				<ToolTip content={t(getKey('editServer.tooltip'))} align="end">
					<IconButton size="xs" onClick={onEdit}>
						<Settings2 className="h-4 w-4" />
					</IconButton>
				</ToolTip>

				<ToolTip content={t(getKey('deleteServer.tooltip'))} align="end">
					<IconButton size="xs" onClick={onDelete}>
						<Trash2 className="h-4 w-4" />
					</IconButton>
				</ToolTip>
			</div>
		</div>
	)
}

const LOCALE_KEY = 'settingsScene.app/desktop.sections.configuredServers'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
