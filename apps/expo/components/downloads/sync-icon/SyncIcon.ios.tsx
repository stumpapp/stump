import { Host, Image } from '@expo/ui/swift-ui'
import { View } from 'react-native'

import { cn } from '~/lib/utils'

import { SyncIconProps } from './types'

export function SyncIcon({ status, size = 16 }: SyncIconProps) {
	const isAttemptingSync = status === 'SYNCING'

	return (
		<View className={cn({ 'animate-spin': isAttemptingSync })}>
			<Host matchContents>
				<Image systemName={ICONS[status] ?? 'icloud.slash'} size={size} />
			</Host>
		</View>
	)
}

const ICONS: Record<SyncIconProps['status'], React.ComponentProps<typeof Image>['systemName']> = {
	ERROR: 'xmark.icloud.fill',
	SYNCED: 'checkmark.icloud.fill',
	SYNCING: 'arrow.triangle.2.circlepath',
	UNSYNCED: 'icloud.slash.fill',
}
