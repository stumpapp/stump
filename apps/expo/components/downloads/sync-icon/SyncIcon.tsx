import { CloudCheck, RefreshCw, WifiSync } from 'lucide-react-native'

import { Icon } from '~/components/ui/icon'

import { SyncIconProps } from './types'

export function SyncIcon({ isAttemptingSync, isSynced }: SyncIconProps) {
	return (
		<Icon
			className={isAttemptingSync ? 'animate-spin' : undefined}
			as={isAttemptingSync ? RefreshCw : isSynced ? CloudCheck : WifiSync}
		/>
	)
}
