import { CloudAlert, CloudCheck, CloudOff, RefreshCw } from 'lucide-react-native'

import { Icon } from '~/components/ui/icon'

import { SyncIconProps } from './types'

export function SyncIcon({ status, size }: SyncIconProps) {
	const isAttemptingSync = status === 'SYNCING'

	return (
		<Icon
			className={isAttemptingSync ? 'animate-spin' : undefined}
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
