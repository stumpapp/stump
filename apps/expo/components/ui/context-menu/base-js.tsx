import * as ContextMenuPrimitive from '@rn-primitives/context-menu'
import * as Haptics from 'expo-haptics'
import { Check, ChevronDown, ChevronRight, ChevronUp } from 'lucide-react-native'
import * as React from 'react'
import {
	Platform,
	type StyleProp,
	StyleSheet,
	Text,
	type TextProps,
	View,
	type ViewStyle,
} from 'react-native'
import { FadeIn } from 'react-native-reanimated'
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens'

import { Icon } from '~/components/ui/icon'
import { NativeOnlyAnimatedView } from '~/components/ui/native-only-animated-view'
import { TextClassContext } from '~/components/ui/text'
import { cn } from '~/lib/utils'

const ContextMenu = ContextMenuPrimitive.Root
function ContextMenuTrigger({
	onLongPress,
	...props
}: React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Trigger>) {
	return (
		<ContextMenuPrimitive.Trigger
			onLongPress={(e) => {
				Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Long_Press)
				onLongPress?.(e)
			}}
			{...props}
		/>
	)
}
const ContextMenuGroup = ContextMenuPrimitive.Group
const ContextMenuSub = ContextMenuPrimitive.Sub
const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup

function ContextMenuSubTrigger({
	className,
	inset,
	children,
	iconClassName,
	onPress,
	...props
}: ContextMenuPrimitive.SubTriggerProps &
	React.RefAttributes<ContextMenuPrimitive.SubTriggerRef> & {
		children?: React.ReactNode
		iconClassName?: string
		inset?: boolean
	}) {
	const { open } = ContextMenuPrimitive.useSubContext()
	const icon = Platform.OS === 'web' ? ChevronRight : open ? ChevronUp : ChevronDown
	return (
		<TextClassContext.Provider
			value={cn(
				'text-lg select-none group-active:text-accent-foreground',
				open && 'text-accent-foreground',
			)}
		>
			<ContextMenuPrimitive.SubTrigger
				onPress={(e) => {
					Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Context_Click)
					onPress?.(e)
				}}
				className={cn(
					'group px-2 py-2 active:bg-background-surface sm:py-1.5 flex flex-row items-center rounded-lg',
					open && cn('bg-accent', Platform.select({ native: 'mb-1' })),
					inset && 'pl-8',
					className,
				)}
				{...props}
			>
				<>{children}</>
				<Icon as={icon} className={cn('size-4 ml-auto shrink-0 text-foreground', iconClassName)} />
			</ContextMenuPrimitive.SubTrigger>
		</TextClassContext.Provider>
	)
}

function ContextMenuSubContent({
	className,
	...props
}: ContextMenuPrimitive.SubContentProps & React.RefAttributes<ContextMenuPrimitive.SubContentRef>) {
	return (
		<NativeOnlyAnimatedView entering={FadeIn}>
			<ContextMenuPrimitive.SubContent
				className={cn(
					'squircle border-edge p-1 shadow-lg shadow-black/5 overflow-hidden rounded-2xl border bg-background',
					className,
				)}
				{...props}
			/>
		</NativeOnlyAnimatedView>
	)
}

const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment

function ContextMenuContent({
	className,
	overlayClassName,
	overlayStyle,
	portalHost,
	...props
}: ContextMenuPrimitive.ContentProps &
	React.RefAttributes<ContextMenuPrimitive.ContentRef> & {
		overlayStyle?: StyleProp<ViewStyle>
		overlayClassName?: string
		portalHost?: string
	}) {
	return (
		<ContextMenuPrimitive.Portal hostName={portalHost}>
			<FullWindowOverlay>
				<ContextMenuPrimitive.Overlay
					style={Platform.select({
						native: overlayStyle
							? StyleSheet.flatten([
									StyleSheet.absoluteFill,
									overlayStyle as typeof StyleSheet.absoluteFill,
								])
							: StyleSheet.absoluteFill,
					})}
					className={overlayClassName}
				>
					<NativeOnlyAnimatedView entering={FadeIn}>
						<TextClassContext.Provider value="text-foreground">
							<ContextMenuPrimitive.Content
								className={cn(
									'squircle border-edge p-3 shadow-lg shadow-black/5 min-w-[12rem] overflow-hidden rounded-2xl border bg-background',
									className,
								)}
								{...props}
							/>
						</TextClassContext.Provider>
					</NativeOnlyAnimatedView>
				</ContextMenuPrimitive.Overlay>
			</FullWindowOverlay>
		</ContextMenuPrimitive.Portal>
	)
}

function ContextMenuItem({
	className,
	inset,
	variant,
	onPress,
	...props
}: ContextMenuPrimitive.ItemProps &
	React.RefAttributes<ContextMenuPrimitive.ItemRef> & {
		className?: string
		inset?: boolean
		variant?: 'default' | 'destructive'
	}) {
	return (
		<TextClassContext.Provider
			value={cn(
				'text-lg text-foreground select-none group-active:text-foreground',
				variant === 'destructive' && 'text-fill-danger group-active:text-fill-danger',
			)}
		>
			<ContextMenuPrimitive.Item
				onPress={(e) => {
					Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Context_Click)
					onPress?.(e)
				}}
				className={cn(
					'squircle group gap-4 px-2 py-2 active:bg-background-surface sm:py-1.5 relative flex flex-row items-center rounded-lg',
					variant === 'destructive' && 'active:bg-fill-danger-secondary',
					props.disabled && 'opacity-50',
					inset && 'pl-8',
					className,
				)}
				{...props}
			/>
		</TextClassContext.Provider>
	)
}

function ContextMenuCheckboxItem({
	className,
	children,
	onPress,
	...props
}: ContextMenuPrimitive.CheckboxItemProps &
	React.RefAttributes<ContextMenuPrimitive.CheckboxItemRef> & {
		children?: React.ReactNode
	}) {
	return (
		<TextClassContext.Provider value="text-lg text-foreground select-none group-active:text-accent-foreground">
			<ContextMenuPrimitive.CheckboxItem
				onPress={(e) => {
					Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Context_Click)
					onPress?.(e)
				}}
				className={cn(
					'group gap-2 py-2 pl-8 pr-2 sm:py-1.5 relative flex flex-row items-center rounded-md active:bg-accent',
					props.disabled && 'opacity-50',
					className,
				)}
				{...props}
			>
				<View className="left-2 h-3.5 w-3.5 absolute flex items-center justify-center">
					<ContextMenuPrimitive.ItemIndicator>
						<Icon
							as={Check}
							className={cn(
								'size-4 text-foreground',
								Platform.select({ web: 'pointer-events-none' }),
							)}
						/>
					</ContextMenuPrimitive.ItemIndicator>
				</View>
				<>{children}</>
			</ContextMenuPrimitive.CheckboxItem>
		</TextClassContext.Provider>
	)
}

function ContextMenuRadioItem({
	className,
	children,
	onPress,
	...props
}: ContextMenuPrimitive.RadioItemProps &
	React.RefAttributes<ContextMenuPrimitive.RadioItemRef> & {
		children?: React.ReactNode
	}) {
	return (
		<TextClassContext.Provider value="text-lg text-foreground select-none group-active:text-foreground">
			<ContextMenuPrimitive.RadioItem
				onPress={(e) => {
					Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Context_Click)
					onPress?.(e)
				}}
				className={cn(
					'group gap-2 py-2 pl-8 pr-2 active:bg-background-surface sm:py-1.5 relative flex flex-row items-center rounded-md',
					props.disabled && 'opacity-50',
					className,
				)}
				{...props}
			>
				<View className="left-2 h-3.5 w-3.5 absolute flex items-center justify-center">
					<ContextMenuPrimitive.ItemIndicator>
						<View className="h-2 w-2 rounded-full bg-foreground" />
					</ContextMenuPrimitive.ItemIndicator>
				</View>
				<>{children}</>
			</ContextMenuPrimitive.RadioItem>
		</TextClassContext.Provider>
	)
}

function ContextMenuLabel({
	className,
	inset,
	...props
}: ContextMenuPrimitive.LabelProps &
	React.RefAttributes<ContextMenuPrimitive.LabelRef> & {
		className?: string
		inset?: boolean
	}) {
	return (
		<ContextMenuPrimitive.Label
			className={cn(
				'px-2 py-2 text-lg font-medium sm:py-1.5 text-foreground',
				inset && 'pl-8',
				className,
			)}
			{...props}
		/>
	)
}

function ContextMenuSeparator({
	className,
	...props
}: ContextMenuPrimitive.SeparatorProps & React.RefAttributes<ContextMenuPrimitive.SeparatorRef>) {
	return (
		<ContextMenuPrimitive.Separator
			className={cn('-mx-1 my-1 bg-edge h-px', className)}
			{...props}
		/>
	)
}

function ContextMenuShortcut({ className, ...props }: TextProps & React.RefAttributes<Text>) {
	return (
		<Text
			className={cn('text-xs tracking-widest text-foreground-muted ml-auto', className)}
			{...props}
		/>
	)
}

export {
	ContextMenu,
	ContextMenuCheckboxItem,
	ContextMenuContent,
	ContextMenuGroup,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuRadioGroup,
	ContextMenuRadioItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
}
