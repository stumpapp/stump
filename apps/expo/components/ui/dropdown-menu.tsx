import * as DropdownMenuPrimitive from '@rn-primitives/dropdown-menu'
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

// TODO(android): Would be nice to add https://docs.expo.dev/versions/latest/sdk/blur-view/

const DropdownMenu = DropdownMenuPrimitive.Root

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

const DropdownMenuGroup = DropdownMenuPrimitive.Group

const DropdownMenuPortal = DropdownMenuPrimitive.Portal

const DropdownMenuSub = DropdownMenuPrimitive.Sub

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

function DropdownMenuSubTrigger({
	className,
	inset,
	children,
	iconClassName,
	...props
}: DropdownMenuPrimitive.SubTriggerProps &
	React.RefAttributes<DropdownMenuPrimitive.SubTriggerRef> & {
		children?: React.ReactNode
		iconClassName?: string
		inset?: boolean
	}) {
	const { open } = DropdownMenuPrimitive.useSubContext()
	const icon = Platform.OS === 'web' ? ChevronRight : open ? ChevronUp : ChevronDown
	return (
		<TextClassContext.Provider
			value={cn('select-none group-active:text-foreground', open && 'text-foreground')}
		>
			<DropdownMenuPrimitive.SubTrigger
				className={cn(
					'squircle group flex flex-row items-center rounded-lg px-2 py-2 active:bg-background-surface sm:py-1.5',
					open && 'bg-background-surface',
					inset && 'pl-8',
					className,
				)}
				{...props}
			>
				<>{children}</>
				<Icon
					as={icon}
					size={20}
					className={cn('ml-auto shrink-0 text-foreground', iconClassName)}
				/>
			</DropdownMenuPrimitive.SubTrigger>
		</TextClassContext.Provider>
	)
}

function DropdownMenuSubContent({
	className,
	...props
}: DropdownMenuPrimitive.SubContentProps &
	React.RefAttributes<DropdownMenuPrimitive.SubContentRef>) {
	return (
		<NativeOnlyAnimatedView entering={FadeIn}>
			<DropdownMenuPrimitive.SubContent
				className={cn(
					'squircle overflow-hidden rounded-md border border-edge bg-background p-1 shadow-lg shadow-black/5',
					className,
				)}
				{...props}
			/>
		</NativeOnlyAnimatedView>
	)
}

const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment

function DropdownMenuContent({
	className,
	overlayClassName,
	overlayStyle,
	portalHost,
	...props
}: DropdownMenuPrimitive.ContentProps &
	React.RefAttributes<DropdownMenuPrimitive.ContentRef> & {
		overlayStyle?: StyleProp<ViewStyle>
		overlayClassName?: string
		portalHost?: string
	}) {
	return (
		<DropdownMenuPrimitive.Portal hostName={portalHost}>
			<FullWindowOverlay>
				<DropdownMenuPrimitive.Overlay
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
						<TextClassContext.Provider value="text-foreground-subtle">
							<DropdownMenuPrimitive.Content
								className={cn(
									'squircle min-w-[8rem] overflow-hidden rounded-xl border border-edge bg-background p-1 shadow-lg shadow-black/5',
									className,
								)}
								{...props}
							/>
						</TextClassContext.Provider>
					</NativeOnlyAnimatedView>
				</DropdownMenuPrimitive.Overlay>
			</FullWindowOverlay>
		</DropdownMenuPrimitive.Portal>
	)
}

function DropdownMenuItem({
	className,
	inset,
	variant,
	...props
}: DropdownMenuPrimitive.ItemProps &
	React.RefAttributes<DropdownMenuPrimitive.ItemRef> & {
		className?: string
		inset?: boolean
		variant?: 'default' | 'destructive'
	}) {
	return (
		<TextClassContext.Provider
			value={cn(
				'select-none text-base text-foreground group-active:text-foreground',
				variant === 'destructive' && 'text-fill-danger group-active:text-fill-danger',
			)}
		>
			<DropdownMenuPrimitive.Item
				className={cn(
					'squircle group relative flex flex-row items-center gap-2 rounded-lg px-2 py-2 active:bg-background-surface sm:py-1.5',
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

function DropdownMenuCheckboxItem({
	className,
	children,
	...props
}: DropdownMenuPrimitive.CheckboxItemProps &
	React.RefAttributes<DropdownMenuPrimitive.CheckboxItemRef> & {
		children?: React.ReactNode
	}) {
	return (
		<TextClassContext.Provider value="text-base text-foreground select-none group-active:text-accent-foreground">
			<DropdownMenuPrimitive.CheckboxItem
				className={cn(
					'squircle group relative flex flex-row items-center gap-2 rounded-lg py-2 pl-8 pr-2 active:bg-background-surface sm:py-1.5',
					props.disabled && 'opacity-50',
					className,
				)}
				{...props}
			>
				<View className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
					<DropdownMenuPrimitive.ItemIndicator>
						<Icon
							as={Check}
							className={cn(
								'size-4 text-foreground',
								Platform.select({ web: 'pointer-events-none' }),
							)}
						/>
					</DropdownMenuPrimitive.ItemIndicator>
				</View>
				<>{children}</>
			</DropdownMenuPrimitive.CheckboxItem>
		</TextClassContext.Provider>
	)
}

function DropdownMenuRadioItem({
	className,
	children,
	...props
}: DropdownMenuPrimitive.RadioItemProps &
	React.RefAttributes<DropdownMenuPrimitive.RadioItemRef> & {
		children?: React.ReactNode
	}) {
	return (
		<TextClassContext.Provider value="text-base text-foreground select-none group-active:text-accent-foreground">
			<DropdownMenuPrimitive.RadioItem
				className={cn(
					'squircle group relative flex flex-row items-center gap-2 rounded-lg py-2 pl-8 pr-2 active:bg-background-surface sm:py-1.5',
					props.disabled && 'opacity-50',
					className,
				)}
				{...props}
			>
				<View className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
					<DropdownMenuPrimitive.ItemIndicator>
						<Icon as={Check} className={cn('h-5 w-5 font-medium text-foreground')} />
					</DropdownMenuPrimitive.ItemIndicator>
				</View>
				<>{children}</>
			</DropdownMenuPrimitive.RadioItem>
		</TextClassContext.Provider>
	)
}

function DropdownMenuLabel({
	className,
	inset,
	...props
}: DropdownMenuPrimitive.LabelProps &
	React.RefAttributes<DropdownMenuPrimitive.LabelRef> & {
		className?: string
		inset?: boolean
	}) {
	return (
		<DropdownMenuPrimitive.Label
			className={cn(
				'px-2 py-2 text-sm font-medium text-foreground sm:py-1.5',
				inset && 'pl-8',
				className,
			)}
			{...props}
		/>
	)
}

type SeparatorProps = DropdownMenuPrimitive.SeparatorProps &
	React.RefAttributes<DropdownMenuPrimitive.SeparatorRef> & {
		variant?: 'item' | 'group'
	}

function DropdownMenuSeparator({ className, variant = 'item', ...props }: SeparatorProps) {
	return (
		<DropdownMenuPrimitive.Separator
			className={cn(
				'-mx-1 my-1 h-px bg-edge opacity-80',
				{ 'h-2': variant === 'group' },
				className,
			)}
			{...props}
		/>
	)
}

function DropdownMenuShortcut({ className, ...props }: TextProps & React.RefAttributes<Text>) {
	return (
		<Text
			className={cn('text-muted-foreground ml-auto text-xs tracking-widest', className)}
			{...props}
		/>
	)
}

export {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
}
