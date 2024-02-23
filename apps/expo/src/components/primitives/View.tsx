import { StatusBar } from 'expo-status-bar'
import { styled, StyledProps, useColorScheme } from 'nativewind'
import { forwardRef, useMemo } from 'react'
import { View as NativeView, ViewProps } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { cn } from '../utils'

const StyledView = styled(NativeView)

export const View = StyledView

type ScreenRootViewProps = StyledProps<ViewProps> & {
	classes?: string
}
export const ScreenRootView = forwardRef<typeof NativeView, ScreenRootViewProps>(
	({ className, children, classes, ...props }, ref) => {
		const { colorScheme } = useColorScheme()
		const insets = useSafeAreaInsets()

		const defaultStyle = useMemo(
			() => ({
				paddingBottom: insets.bottom,
				paddingLeft: insets.left,
				paddingRight: insets.right,
				paddingTop: insets.top,
			}),
			[insets],
		)

		// console.log({
		// 	className,
		// 	classes,
		// 	merged: cn('flex-1 items-center justify-center dark:bg-gray-950', className, classes),
		// 	props: props,
		// })

		return (
			<View
				{...props}
				style={{
					...(props.style ?? ({} as object)),
					...defaultStyle,
				}}
				// FIXME: className coming through as undefined...
				className={cn('flex-1 items-center justify-center dark:bg-gray-950', className, classes)}
				ref={ref}
			>
				{children}
				<StatusBar style={colorScheme === 'dark' ? 'light' : 'auto'} />
			</View>
		)
	},
)
ScreenRootView.displayName = 'ScreenRootView'
