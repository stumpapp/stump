import { cn, IconButton, Text, ToolTip } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { BadgeCheck, Power, Settings2, Trash2, WifiOff } from 'lucide-react'

import { SavedServer } from '../stores/savedServer'

type Props = {
	/**
	 * The server to display
	 */
	server: SavedServer
	/**
	 * Whether the server is currently active (i.e. connected to)
	 */
	isActive?: boolean
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
	/**
	 * Whether the server is reachable
	 */
	isReachable?: boolean
}

export default function ConfiguredServer({
	server,
	isActive,
	onEdit,
	onDelete,
	onSwitch,
	isReachable,
}: Props) {
	const { t } = useLocaleContext()

	return (
		<div
			className={cn('group flex items-center justify-between p-4', {
				'hover:bg-background-surface-hover/10': isReachable,
			})}
		>
			<div
				className="flex grow cursor-pointer flex-col"
				onClick={isReachable ? onSwitch : undefined}
			>
				<span className="flex items-center space-x-2">
					<Text>{server.name}</Text>
					{isActive && (
						<ToolTip content={t(getKey('activeServer.tooltip'))} align="center">
							<BadgeCheck
								data-testid="activeBadge"
								className="h-4 w-4 text-fill-success text-opacity-75"
								strokeWidth={0.95}
							/>
						</ToolTip>
					)}
					{isReachable === false && (
						<ToolTip content={t(getKey('unreachableServer.tooltip'))} align="center">
							<WifiOff
								data-testid="unreachableBadge"
								className="h-4 w-4 text-fill-danger text-opacity-75"
							/>
						</ToolTip>
					)}
				</span>
				<Text variant="muted" size="sm">
					{server.url}
				</Text>
			</div>

			<div className="flex items-center space-x-1.5 opacity-90 group-hover:opacity-100">
				{/* {!isActive && (
					<ToolTip content={t(getKey('switchToServer.tooltip'))}>
						<IconButton size="xs" onClick={onSwitch} data-testid="switchButton">
							<Power className="h-4 w-4" />
						</IconButton>
					</ToolTip>
				)} */}

				<ToolTip content={t(getKey('editServer.tooltip'))} align="end">
					<IconButton size="xs" onClick={onEdit} data-testid="editButton">
						<Settings2 className="h-4 w-4" />
					</IconButton>
				</ToolTip>

				<ToolTip content={t(getKey('deleteServer.tooltip'))} align="end">
					<IconButton size="xs" onClick={onDelete} data-testid="deleteButton">
						<Trash2 className="h-4 w-4" />
					</IconButton>
				</ToolTip>
			</div>
		</div>
	)
}

const LOCALE_KEY = 'settingsScene.app/desktop.sections.configuredServers'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
