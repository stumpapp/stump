import { useRouter } from 'expo-router'
import { View } from 'react-native'
import Animated from 'react-native-reanimated'
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context'

import { Heading } from '~/components/ui'
import { HeaderButton } from '~/components/ui/header-button/header-button'
import { COLORS } from '~/lib/constants'
import { usePdfStore } from '~/stores/pdf'

import { useReaderAnimations } from '../shared'
import { PagedActionMenu } from '../shared/paged-action-menu/PagedActionMenu'
import { usePdfReaderContext } from './context'

export function PdfReaderHeader() {
	const { serverId, resetTimer } = usePdfReaderContext()

	const book = usePdfStore((state) => state.book)
	const { secondaryStyle } = useReaderAnimations()

	const insets = useSafeAreaInsets()
	const router = useRouter()

	return (
		<Animated.View
			key={book?.id}
			className="inset-x-safe absolute z-20 gap-4 px-4"
			style={[{ top: initialWindowMetrics?.insets.top || insets.top }, secondaryStyle]}
		>
			<View className="flex-row items-center justify-between">
				<HeaderButton onPress={() => router.back()} ios={{ variant: 'glass' }} />

				{book && <PagedActionMenu book={book} serverId={serverId} onResetTimer={resetTimer} />}
			</View>

			<Heading
				className="font-semibold tablet:text-3xl"
				numberOfLines={2}
				ellipsizeMode="tail"
				style={{
					color: COLORS.dark.foreground.DEFAULT,
				}}
			>
				{book?.name}
			</Heading>
		</Animated.View>
	)
}
