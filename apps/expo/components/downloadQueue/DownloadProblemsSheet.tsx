import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { RefreshCw, Trash2 } from 'lucide-react-native'
import { forwardRef } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useColors } from '~/lib/constants'
import { useDownloadQueue } from '~/lib/hooks'

import { CardList, Heading } from '../ui'
import { Button } from '../ui/button'
import { Icon } from '../ui/icon'
import { Text } from '../ui/text'
import FailedDownloadItem from './FailedDownloadItem'

type Props = {
	onDismiss?: () => void
}

export const DownloadProblemsSheet = forwardRef<TrueSheet, Props>(function DownloadProblemsSheet(
	{ onDismiss },
	ref,
) {
	const colors = useColors()
	const insets = useSafeAreaInsets()

	const { failedItems, retry, dismiss, retryAllFailed, dismissAllFailed } = useDownloadQueue()

	return (
		<TrueSheet
			ref={ref}
			detents={['auto', 1]}
			cornerRadius={24}
			grabber
			scrollable
			backgroundColor={colors.sheet.background}
			grabberOptions={{
				color: colors.sheet.grabber,
			}}
			style={{
				paddingTop: 12,
				paddingBottom: insets.bottom + 16,
			}}
			onDidDismiss={onDismiss}
			header={
				<View className="gap-4 px-6 pt-8">
					<Heading size="2xl">Failed Downloads</Heading>
				</View>
			}
		>
			<View className="flex-1 gap-4 px-4 pb-4">
				{/* TODO: Thumbs up owl or something */}
				{failedItems.length === 0 && (
					<View className="items-center justify-center py-8">
						<Text className="text-foreground-muted">No failed downloads</Text>
					</View>
				)}

				{failedItems.length > 0 && (
					<>
						<View className="flex-row gap-2">
							<Button
								variant="outline"
								roundness="full"
								className="flex-1 flex-row gap-2"
								onPress={retryAllFailed}
							>
								<Icon as={RefreshCw} size={14} />
								<Text>Retry All</Text>
							</Button>

							<Button
								variant="destructive"
								roundness="full"
								className="flex-1 flex-row gap-2"
								onPress={dismissAllFailed}
							>
								<Icon as={Trash2} size={14} className="text-white" />
								<Text>Dismiss All</Text>
							</Button>
						</View>

						<CardList>
							{failedItems.map((item) => (
								<FailedDownloadItem key={item.id} item={item} onRetry={retry} onDismiss={dismiss} />
							))}
						</CardList>
					</>
				)}
			</View>
		</TrueSheet>
	)
})
