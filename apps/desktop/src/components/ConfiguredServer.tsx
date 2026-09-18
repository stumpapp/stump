import { Button, cn, NewCard, Text, ToolTip } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { BadgeCheck, Settings2, Trash2 } from 'lucide-react'

import { SavedServer } from '../stores/savedServer'

type Props = {
	server: SavedServer
	isActive?: boolean
	onEdit: () => void
	onDelete: () => void
	onSwitch: () => void
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

	// TODO: avatar + little status indicator, looks poopy just indicator
	return (
		<NewCard>
			<NewCard.Row>
				<div className="gap-3 flex w-full items-center">
					<ToolTip
						content={
							isReachable === true
								? t(getKey('reachableServer.tooltip'))
								: isReachable === false
									? t(getKey('unreachableServer.tooltip'))
									: t(getKey('checkingServer.tooltip'))
						}
						align="start"
					>
						<div
							className={cn('h-2 w-2 shrink-0 rounded-full bg-muted-foreground/30', {
								'bg-green-500': isReachable,
								'bg-red-500/70 animate-pulse': isReachable === false,
							})}
						/>
					</ToolTip>

					<div
						className={cn('min-w-0 flex-1', { 'cursor-pointer': isReachable })}
						onClick={isReachable ? onSwitch : undefined}
					>
						<span className="gap-1.5 flex items-center">
							<Text size="sm" className="font-medium leading-tight truncate">
								{server.name}
							</Text>
							{isActive && (
								<ToolTip content={t(getKey('activeServer.tooltip'))} align="center">
									<BadgeCheck
										className="h-3.5 w-3.5 text-fill-success/75 shrink-0"
										strokeWidth={0.95}
									/>
								</ToolTip>
							)}
						</span>
						<Text variant="muted" size="sm" className="leading-tight truncate">
							{server.url}
						</Text>
					</div>

					<div className="gap-1 flex items-center">
						<ToolTip content={t(getKey('editServer.tooltip'))} align="end">
							<Button
								variant="outline"
								size="icon"
								className="size-7"
								onClick={onEdit}
								data-testid="editButton"
							>
								<Settings2 className="h-3.5 w-3.5" />
							</Button>
						</ToolTip>
						<ToolTip content={t(getKey('deleteServer.tooltip'))} align="end">
							<Button
								variant="outline"
								size="icon"
								className="size-7"
								onClick={onDelete}
								data-testid="deleteButton"
							>
								<Trash2 className="h-3.5 w-3.5" />
							</Button>
						</ToolTip>
					</div>
				</div>
			</NewCard.Row>
		</NewCard>
	)
}

const LOCALE_KEY = 'settingsScene.app/desktop.sections.configuredServers'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
