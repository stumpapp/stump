import {
	CircularProgressIndicator as AndroidCircularProgress,
	Host as AndroidHost,
} from '@expo/ui/jetpack-compose'
import { size } from '@expo/ui/jetpack-compose/modifiers'
import { Host, ProgressView as IosCircularProgress } from '@expo/ui/swift-ui'
import { progressViewStyle, tint } from '@expo/ui/swift-ui/modifiers'
import { Platform, View } from 'react-native'

import { useColors, usePalette } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'

import { Text } from './text'

// TODO: split this into .ios.tsx / .android.tsx, did this before i was more aware that pattern existed

type NativeLoaderProps = {
	color: string
	android?: {
		size?: number
		strokeWidth?: number
	}
}

// https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/progressview/
const IosLoader = ({ color }: NativeLoaderProps) => (
	<Host style={{ width: 300 }}>
		<IosCircularProgress modifiers={[progressViewStyle('circular'), tint(color)]} />
	</Host>
)

const AndroidLoader = ({ color, android }: NativeLoaderProps) => {
	const { colorScheme } = useColorScheme()
	const colors = useColors()

	return (
		<AndroidHost matchContents>
			<AndroidCircularProgress
				color={color}
				trackColor={colorScheme === 'dark' ? colors.foreground.muted : '#cccccc'}
				{...(android?.size ? { modifiers: [size(android.size, android.size)] } : {})}
				{...(android?.strokeWidth ? { strokeWidth: android.strokeWidth } : {})}
				// ^ setting to undefined seems to fuck things up a bit so conditionally adding it
			/>
		</AndroidHost>
	)
}

const WrappedLoader = ({ color, ...props }: Partial<NativeLoaderProps>) => {
	const colors = useColors()
	const accentColor = usePalette('accent')

	return Platform.select({
		ios: <IosLoader color={color || accentColor || colors.fill.brand.DEFAULT} />,
		android: <AndroidLoader color={color || accentColor || colors.fill.brand.DEFAULT} {...props} />,
	})
}

const Loader = ({ color, ...props }: Partial<NativeLoaderProps>) => (
	<WrappedLoader color={color} {...props} />
)

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
