import { CircularProgress as AndroidCircularProgress } from '@expo/ui/jetpack-compose'
import { CircularProgress as IosCircularProgress, Host } from '@expo/ui/swift-ui'
import { Platform, View } from 'react-native'

import { useColors } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'
import { usePreferencesStore } from '~/stores'

import { Text } from './text'

type NativeLoaderProps = {
	color: string
}

const IosLoader = ({ color }: NativeLoaderProps) => (
	<Host style={{ width: 300 }}>
		<IosCircularProgress color={color} />
	</Host>
)

const AndroidLoader = ({ color }: NativeLoaderProps) => {
	const { colorScheme } = useColorScheme()
	const colors = useColors()
	return (
		<AndroidCircularProgress
			style={{ width: 35 }}
			color={color}
			elementColors={{ trackColor: colorScheme === 'dark' ? colors.foreground.muted : '#cccccc' }}
		/>
	)
}

const WrappedLoader = ({ color }: Partial<NativeLoaderProps>) => {
	const accentColor = usePreferencesStore((state) => state.accentColor)
	const colors = useColors()

	const Component = Platform.OS === 'ios' ? IosLoader : AndroidLoader

	return <Component color={color || accentColor || colors.fill.brand.DEFAULT} />
}

const Loader = ({ color }: Partial<NativeLoaderProps>) => <WrappedLoader color={color} />

type FullScreenLoaderProps = {
	label?: string
} & Partial<NativeLoaderProps>

const FullScreenLoader = ({ label, ...props }: FullScreenLoaderProps) => (
	<View className="android:gap-4 ios:gap-7 flex h-full w-full items-center justify-center">
		<Loader {...props} />
		{label && <Text className="text-base text-foreground-subtle">{label}</Text>}
	</View>
)

export { FullScreenLoader, Loader }
