import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { RefreshCw, Trash2 } from 'lucide-react-native'
import { forwardRef } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useColors } from '~/lib/constants'
import { useDownloadQueue, useTranslate } from '~/lib/hooks'

import { Card, Heading } from '../ui'
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

	const { t } = useTranslate()
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
					<Heading size="2xl">{t(getKey('title'))}</Heading>
				</View>
			}
		>
			<View className="gap-4 px-4 pb-4 flex-1">
				{/* TODO: Thumbs up owl or something */}
				{failedItems.length === 0 && (
					<View className="py-8 items-center justify-center">
						<Text className="text-foreground-muted">{t(getKey('noFailedDownloads'))}</Text>
					</View>
				)}

				{failedItems.length > 0 && (
					<>
						<View className="gap-2 flex-row">
							<Button
								variant="outline"
								roundness="full"
								className="gap-2 flex-1 flex-row"
								onPress={retryAllFailed}
							>
								<Icon as={RefreshCw} size={14} />
								<Text>{t(getKey('retryAll'))}</Text>
							</Button>

							<Button
								variant="destructive"
								roundness="full"
								className="gap-2 flex-1 flex-row"
								onPress={dismissAllFailed}
							>
								<Icon as={Trash2} size={14} className="text-white" />
								<Text>{t(getKey('dismissAll'))}</Text>
							</Button>
						</View>

						<Card>
							{failedItems.map((item) => (
								<FailedDownloadItem key={item.id} item={item} onRetry={retry} onDismiss={dismiss} />
							))}
						</Card>
					</>
				)}
			</View>
		</TrueSheet>
	)
})

const LOCALE_BASE = 'localLibrary.downloadProblemsSheet'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
