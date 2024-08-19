/* eslint-disable react/prop-types */
import * as TabsPrimitive from '@radix-ui/react-tabs'
import React from 'react'

import { cn } from '../utils'
import { TabsContext, TabsVariant } from './context'

const TABS_CONTENT_VARIANTS: Record<TabsVariant, string> = {
	default:
		'text-foreground-subtle data-[state=active]:bg-background data-[state=active]:text-foreground',
	primary:
		'text-foreground-subtle data-[state=active]:bg-brand-300 data-[state=active]:text-brand-800',
}

export type TabsProps = {
	variant?: TabsVariant
	activeOnHover?: boolean
} & React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
const Tabs = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Root>, TabsProps>(
	({ variant = 'default', activeOnHover, ...props }, ref) => (
		<TabsContext.Provider value={{ activeOnHover, variant }}>
			<TabsPrimitive.Root ref={ref} {...props} />
		</TabsContext.Provider>
	),
)
Tabs.displayName = TabsPrimitive.Root.displayName

const TabsList = React.forwardRef<
	React.ElementRef<typeof TabsPrimitive.List>,
	React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
	<TabsContext.Consumer>
		{({ activeOnHover }) => (
			<TabsPrimitive.List
				ref={ref}
				className={cn(
					'inline-flex items-center justify-center rounded-md border border-edge-subtle/80 bg-transparent p-1',
					{ 'gap-1': activeOnHover },
					className,
				)}
				{...props}
			/>
		)}
	</TabsContext.Consumer>
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
	React.ElementRef<typeof TabsPrimitive.Trigger>,
	React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
	<TabsContext.Consumer>
		{({ variant, activeOnHover }) => (
			<TabsPrimitive.Trigger
				className={cn(
					'inline-flex min-w-[100px] items-center justify-center rounded-[0.185rem] px-3 py-1.5 text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm',
					TABS_CONTENT_VARIANTS[variant] || TABS_CONTENT_VARIANTS.default,
					{
						'hover:data-[state=inactive]:bg-background-surface': activeOnHover && !props.disabled,
					},
					{
						'pointer-events-none opacity-50': props.disabled,
					},
					className,
				)}
				{...props}
				ref={ref}
			/>
		)}
	</TabsContext.Consumer>
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
	React.ElementRef<typeof TabsPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
	<TabsPrimitive.Content
		className={cn('mt-2 rounded-md border border-edge-subtle p-6', className)}
		{...props}
		ref={ref}
	/>
))
TabsContent.displayName = TabsPrimitive.Content.displayName

type TabsSubComponents = {
	List: typeof TabsList
	Trigger: typeof TabsTrigger
	Content: typeof TabsContent
}
const TypedTabs = Tabs as typeof Tabs & TabsSubComponents
TypedTabs.List = TabsList
TypedTabs.Trigger = TabsTrigger
TypedTabs.Content = TabsContent

export { TypedTabs as Tabs, TabsContent, TabsList, TabsTrigger }
