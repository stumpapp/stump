import { Host, Image } from '@expo/ui/swift-ui'
import { View } from 'react-native'

import { cn } from '~/lib/utils'

import { SyncIconProps } from './types'

export function SyncIcon({ isAttemptingSync, isSynced }: SyncIconProps) {
	return (
		<View className={cn({ 'animate-spin': isAttemptingSync })}>
			<Host matchContents>
				<Image
					systemName={
						isAttemptingSync
							? 'arrow.triangle.2.circlepath'
							: isSynced
								? 'checkmark.icloud.fill'
								: 'wifi.exclamationmark'
					}
					size={16}
				/>
			</Host>
		</View>
	)
}
