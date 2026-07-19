import { useRouter } from 'expo-router'
import { X } from 'lucide-react-native'
import { Platform, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context'

import { Heading } from '~/components/ui'
import { HeaderButton } from '~/components/ui/header-button/header-button'
import { COLORS, IS_IOS_26_PLUS } from '~/lib/constants'

import { PagedActionMenu } from '../shared/paged-action-menu/PagedActionMenu'
import { useReaderAnimations } from '../shared/readerAnimations'
import { useImageBasedReader } from './context'

type Props = {
	onShowGlobalSettings: () => void
}

export default function Header({ onShowGlobalSettings }: Props) {
	const { book, timer, serverId } = useImageBasedReader()

	const insets = useSafeAreaInsets()
	const { secondaryStyle } = useReaderAnimations()

	const router = useRouter()

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
					onResetTimer={timer.reset}
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
