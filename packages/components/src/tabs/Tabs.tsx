import * as TabsPrimitive from '@radix-ui/react-tabs'
import type { ComponentPropsWithoutRef, ElementRef } from 'react'
import React from 'react'

import { cn } from '../utils'
import { TabsContext, TabsVariant } from './context'

const TABS_CONTENT_VARIANTS: Record<TabsVariant, string> = {
	default:
		'text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground',
	primary:
		'text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground',
}

export type TabsProps = {
	variant?: TabsVariant
	activeOnHover?: boolean
} & ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
const Tabs = React.forwardRef<ElementRef<typeof TabsPrimitive.Root>, TabsProps>(
	({ variant = 'default', activeOnHover, ...props }, ref) => (
		<TabsContext.Provider value={{ activeOnHover, variant }}>
			<TabsPrimitive.Root ref={ref} {...props} />
		</TabsContext.Provider>
	),
)
Tabs.displayName = TabsPrimitive.Root.displayName

const TabsList = React.forwardRef<
	ElementRef<typeof TabsPrimitive.List>,
	ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
	<TabsContext.Consumer>
		{({ activeOnHover }) => (
			<TabsPrimitive.List
				ref={ref}
				className={cn(
					'p-0.75 inline-flex w-fit items-center justify-center rounded-md bg-muted',
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
	ElementRef<typeof TabsPrimitive.Trigger>,
	ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
	<TabsContext.Consumer>
		{({ variant, activeOnHover }) => (
			<TabsPrimitive.Trigger
				className={cn(
					'px-2 py-1 text-sm font-medium min-w-25 gap-1.5 inline-flex items-center justify-center rounded-sm border border-transparent transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
					TABS_CONTENT_VARIANTS[variant] || TABS_CONTENT_VARIANTS.default,
					{
						'hover:data-[state=inactive]:text-foreground': activeOnHover && !props.disabled,
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
	ElementRef<typeof TabsPrimitive.Content>,
	ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
	<TabsPrimitive.Content
		className={cn('mt-2 p-6 rounded-md border border-border', className)}
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
