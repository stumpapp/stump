/* eslint-disable react/prop-types */

import * as NavigationMenuPrimitive from '@radix-ui/react-navigation-menu'
import { cva } from 'class-variance-authority'
import { ChevronDown } from 'lucide-react'
import * as React from 'react'

import { cn } from '../utils'

type NavigationMenuProps = {
	viewPortProps?: Pick<NavigationMenuViewportProps, 'containerClassName' | 'className' | 'align'>
} & React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root>

const NavigationMenu = React.forwardRef<
	React.ElementRef<typeof NavigationMenuPrimitive.Root>,
	NavigationMenuProps
>(({ className, children, viewPortProps, ...props }, ref) => (
	<NavigationMenuPrimitive.Root
		ref={ref}
		className={cn('relative z-10 flex max-w-max flex-1 items-center justify-center', className)}
		{...props}
	>
		{children}
		<NavigationMenuViewport {...viewPortProps} />
	</NavigationMenuPrimitive.Root>
))
NavigationMenu.displayName = NavigationMenuPrimitive.Root.displayName

const NavigationMenuList = React.forwardRef<
	React.ElementRef<typeof NavigationMenuPrimitive.List>,
	React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.List>
>(({ className, ...props }, ref) => (
	<NavigationMenuPrimitive.List
		ref={ref}
		className={cn('group flex flex-1 list-none items-center justify-center space-x-1', className)}
		{...props}
	/>
))
NavigationMenuList.displayName = NavigationMenuPrimitive.List.displayName

const NavigationMenuItem = NavigationMenuPrimitive.Item

const navigationMenuTriggerStyle = cva(
	'group inline-flex h-9 w-max items-center justify-center rounded-md bg-sidebar text-foreground-subtle hover:bg-sidebar-surface-hover px-4 py-2 text-sm font-medium transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-sidebar-surface data-[state=open]:bg-sidebar-surface',
)

const NavigationMenuTrigger = React.forwardRef<
	React.ElementRef<typeof NavigationMenuPrimitive.Trigger>,
	React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Trigger> & {
		showChevron?: boolean
	}
>(({ className, children, showChevron = true, ...props }, ref) => (
	<NavigationMenuPrimitive.Trigger
		ref={ref}
		className={cn(
			navigationMenuTriggerStyle(),
			'group',
			{ 'h-[2.35rem] w-[2.35rem] p-0 px-0 py-0': !showChevron },
			className,
		)}
		{...props}
	>
		{children}{' '}
		{showChevron && (
			<ChevronDown
				className="relative top-[1px] ml-1 h-3 w-3 transition duration-300 group-data-[state=open]:rotate-180"
				aria-hidden="true"
			/>
		)}
	</NavigationMenuPrimitive.Trigger>
))
NavigationMenuTrigger.displayName = NavigationMenuPrimitive.Trigger.displayName

const NavigationMenuContent = React.forwardRef<
	React.ElementRef<typeof NavigationMenuPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
	<NavigationMenuPrimitive.Content
		ref={ref}
		className={cn(
			'left-0 top-0 w-full data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 md:absolute md:w-auto ',
			className,
		)}
		{...props}
	/>
))
NavigationMenuContent.displayName = NavigationMenuPrimitive.Content.displayName

const NavigationMenuLink = NavigationMenuPrimitive.Link

type NavigationMenuViewportProps = {
	containerClassName?: string
	align?: 'left' | 'right'
} & React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Viewport>
const NavigationMenuViewport = React.forwardRef<
	React.ElementRef<typeof NavigationMenuPrimitive.Viewport>,
	NavigationMenuViewportProps
>(({ className, containerClassName, align = 'left', ...props }, ref) => (
	<div
		className={cn(
			'absolute top-full flex justify-center',
			{ 'left-auto right-0': align === 'right' },
			{ 'left-0 right-auto': align === 'left' },
			containerClassName,
		)}
	>
		<NavigationMenuPrimitive.Viewport
			className={cn(
				'origin-top-center relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden rounded-md border border-edge-subtle bg-background shadow data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90 md:w-[var(--radix-navigation-menu-viewport-width)]',
				className,
			)}
			ref={ref}
			{...props}
		/>
	</div>
))
NavigationMenuViewport.displayName = NavigationMenuPrimitive.Viewport.displayName

const NavigationMenuIndicator = React.forwardRef<
	React.ElementRef<typeof NavigationMenuPrimitive.Indicator>,
	React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Indicator>
>(({ className, ...props }, ref) => (
	<NavigationMenuPrimitive.Indicator
		ref={ref}
		className={cn(
			'top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:fade-in',
			className,
		)}
		{...props}
	>
		<div className="relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-edge shadow-md" />
	</NavigationMenuPrimitive.Indicator>
))
NavigationMenuIndicator.displayName = NavigationMenuPrimitive.Indicator.displayName

type NavigationSubComponents = {
	Content: typeof NavigationMenuContent
	Indicator: typeof NavigationMenuIndicator
	Item: typeof NavigationMenuItem
	Link: typeof NavigationMenuLink
	List: typeof NavigationMenuList
	Trigger: typeof NavigationMenuTrigger
	Viewport: typeof NavigationMenuViewport
}

const TypedNavigationMenu = NavigationMenu as typeof NavigationMenu & NavigationSubComponents

TypedNavigationMenu.Content = NavigationMenuContent
TypedNavigationMenu.Indicator = NavigationMenuIndicator
TypedNavigationMenu.Item = NavigationMenuItem
TypedNavigationMenu.Link = NavigationMenuLink
TypedNavigationMenu.List = NavigationMenuList
TypedNavigationMenu.Trigger = NavigationMenuTrigger
TypedNavigationMenu.Viewport = NavigationMenuViewport

export { TypedNavigationMenu as NavigationMenu, navigationMenuTriggerStyle }
