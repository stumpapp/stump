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
	disabledBottomInset?: boolean
	applyPadding?: boolean
}
export const ScreenRootView = forwardRef<typeof NativeView, ScreenRootViewProps>(
	({ className, children, classes, disabledBottomInset, applyPadding, ...props }, ref) => {
		const { colorScheme } = useColorScheme()
		const insets = useSafeAreaInsets()

		const defaultStyle = useMemo(() => {
			const paddingLeft = applyPadding ? 16 + insets.left : 0
			const paddingRight = applyPadding ? 16 + insets.right : 0
			return {
				paddingBottom: disabledBottomInset ? undefined : insets.bottom,
				paddingLeft,
				paddingRight,
				paddingTop: insets.top,
			}
		}, [insets, disabledBottomInset, applyPadding])

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
				<StatusBar key={colorScheme} style={colorScheme === 'dark' ? 'light' : 'dark'} />
			</View>
		)
	},
)
ScreenRootView.displayName = 'ScreenRootView'
