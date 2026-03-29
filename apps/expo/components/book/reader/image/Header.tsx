import { ReadingDirection } from '@stump/graphql'
import { useRouter } from 'expo-router'
import { X } from 'lucide-react-native'
import { useCallback } from 'react'
import { Platform, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context'

import { Heading } from '~/components/ui'
import { HeaderButton } from '~/components/ui/header-button/header-button'
import { COLORS } from '~/lib/constants'
import { useReaderStore } from '~/stores'
import { useBookPreferences } from '~/stores/reader'

import { PagedActionMenu } from '../shared/paged-action-menu/PagedActionMenu'
import { useReaderAnimations } from '../shared/readerAnimations'
import { useImageBasedReader } from './context'

type Props = {
	onShowGlobalSettings: () => void
}

export default function Header({ onShowGlobalSettings }: Props) {
	const { book, resetTimer, serverId } = useImageBasedReader()
	const {
		preferences: { readingDirection },
		setBookPreferences,
	} = useBookPreferences({ book, serverId })

	// TODO: I think global incognito makes sense but isn't exposed very well right now
	const incognito = useReaderStore((state) => state.globalSettings.incognito)
	const insets = useSafeAreaInsets()
	const { secondaryStyle } = useReaderAnimations()

	const onChangeReadingDirection = useCallback(() => {
		setBookPreferences({
			readingDirection:
				readingDirection === ReadingDirection.Ltr ? ReadingDirection.Rtl : ReadingDirection.Ltr,
		})
	}, [readingDirection, setBookPreferences])

	const router = useRouter()

	return (
		<Animated.View
			className="inset-x-safe absolute z-20 gap-2 px-2"
			style={[{ top: initialWindowMetrics?.insets.top || insets.top }, secondaryStyle]}
		>
			<View className="relative flex-row items-center justify-between">
				<HeaderButton
					icon={{
						android: X,
						ios: 'xmark',
						color: Platform.OS === 'android' ? COLORS.dark.foreground.DEFAULT : 'primary',
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
					incognito={incognito}
					book={book}
					serverId={serverId}
					onResetTimer={resetTimer}
					onChangeReadingDirection={onChangeReadingDirection}
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
