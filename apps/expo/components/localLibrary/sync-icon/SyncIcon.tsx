import { CloudAlert, CloudCheck, CloudOff, RefreshCw } from 'lucide-react-native'

import { Icon } from '~/components/ui/icon'
import { cn } from '~/lib/utils'

import { SyncIconProps } from './types'

export function SyncIcon({ status, size = 20 }: SyncIconProps) {
	const isAttemptingSync = status === 'SYNCING'

	return (
		<Icon
			className={cn('text-white shadow', isAttemptingSync ? 'animate-spin' : undefined)}
			as={ICONS[status] ?? CloudOff}
			size={size}
		/>
	)
}

const ICONS: Record<SyncIconProps['status'], typeof CloudAlert> = {
	ERROR: CloudAlert,
	SYNCED: CloudCheck,
	SYNCING: RefreshCw,
	UNSYNCED: CloudOff,
}
