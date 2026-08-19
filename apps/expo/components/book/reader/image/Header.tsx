import { useRouter } from 'expo-router'
import { X } from 'lucide-react-native'
import { Alert, Platform, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context'

import { useActiveServerSafe } from '~/components/activeServer'
import { Heading } from '~/components/ui'
import { HeaderButton } from '~/components/ui/header-button/header-button'
import { COLORS, IS_IOS_26_PLUS } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'

import { PagedActionMenu } from '../shared/paged-action-menu/PagedActionMenu'
import { useReaderAnimations } from '../shared/readerAnimations'
import { useImageBasedReader } from './context'

type Props = {
	onShowGlobalSettings: () => void
}

export default function Header({ onShowGlobalSettings }: Props) {
	const { t } = useTranslate()

	const { book, resetTimer, serverId } = useImageBasedReader()
	const activeServerCtx = useActiveServerSafe()

	const insets = useSafeAreaInsets()
	const { secondaryStyle } = useReaderAnimations()

	const router = useRouter()

	const confirmResetTimer = () => {
		Alert.alert(
			t('readerSettings.readingTimer.resetTimer'),
			t('readerSettings.readingTimer.confirmation.message', {
				bookName: book.name,
				action:
					activeServerCtx?.activeServer.kind === 'stump'
						? t('readerSettings.readingTimer.confirmation.action.multi-session')
						: t('readerSettings.readingTimer.confirmation.action.single-session'),
			}),
			[
				{ text: t('common.cancel'), style: 'cancel' },
				{ text: t('common.reset'), style: 'destructive', onPress: resetTimer },
			],
		)
	}

	return (
		<Animated.View
			className="inset-x-safe gap-2 px-2 absolute z-20"
			style={[{ top: initialWindowMetrics?.insets.top || insets.top }, secondaryStyle]}
		>
			<View className="relative flex-row items-center justify-between">
				<HeaderButton
					icon={{
						android: X,
						ios: 'xmark',
						color:
							Platform.OS === 'android' || !IS_IOS_26_PLUS
								? COLORS.dark.foreground.DEFAULT
								: 'primary',
					}}
					onPress={() => router.back()}
					ios={{ variant: 'glass' }}
					style={
						Platform.OS === 'android'
							? {
									backgroundColor: COLORS.dark.background.overlay.DEFAULT,
									borderColor: COLORS.dark.edge.DEFAULT,
									height: 40,
									width: 40,
								}
							: undefined
					}
				/>

				<PagedActionMenu
					book={book}
					serverId={serverId}
					onResetTimer={confirmResetTimer}
					onShowSettings={onShowGlobalSettings}
				/>
			</View>

			<Heading
				className="font-semibold tablet:text-3xl"
				numberOfLines={2}
				ellipsizeMode="tail"
				style={{
					color: COLORS.dark.foreground.DEFAULT,
				}}
			>
				{book.name}
			</Heading>
		</Animated.View>
	)
}
