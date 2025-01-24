import { StatusBar } from 'expo-status-bar'
import { forwardRef, useMemo } from 'react'
import { useColorScheme, View as RNView, ViewProps } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { cn } from '../utils'

type ScreenRootViewProps = {
	classes?: string
	disabledBottomInset?: boolean
	applyPadding?: boolean
} & ViewProps

export const ScreenRootView = forwardRef<typeof RNView, ScreenRootViewProps>(
	({ className, children, classes, disabledBottomInset, applyPadding, ...props }, ref) => {
		const colorScheme = useColorScheme()
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
			<RNView
				{...props}
				style={{
					...(props.style ?? ({} as object)),
					...defaultStyle,
				}}
				// FIXME: className coming through as undefined...
				className={cn('flex-1 items-center justify-center dark:bg-gray-950', className, classes)}
				// @ts-expect-error: why is this wrong?
				ref={ref}
			>
				{children}
				<StatusBar key={colorScheme} style={colorScheme === 'dark' ? 'light' : 'dark'} />
			</RNView>
		)
	},
)
ScreenRootView.displayName = 'ScreenRootView'
