import { StatusBar } from 'expo-status-bar'
import { styled, StyledProps } from 'nativewind'
import { forwardRef } from 'react'
import { View as NativeView, ViewProps } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { cn } from '../utils'

const StyledView = styled(NativeView)

export const View = StyledView

export const ScreenRootView = forwardRef<typeof NativeView, StyledProps<ViewProps>>(
	({ className, children, ...props }, ref) => {
		const insets = useSafeAreaInsets()

		return (
			<StyledView
				style={{
					paddingBottom: insets.bottom,
					paddingLeft: insets.left,
					paddingRight: insets.right,
					paddingTop: insets.top,
				}}
				className={cn('flex-1 items-center justify-center dark:bg-gray-950', className)}
				{...props}
				ref={ref}
			>
				{children}
				<StatusBar style="auto" />
			</StyledView>
		)
	},
)
ScreenRootView.displayName = 'ScreenRootView'
