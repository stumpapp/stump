/* eslint-disable react/prop-types */
import * as TabsPrimitive from '@radix-ui/react-tabs'
import React from 'react'

import { cn } from '../utils'
import { TabsContext, TabsVariant } from './context'

const TABS_CONTENT_VARIANTS: Record<TabsVariant, string> = {
	default:
		'text-gray-700 data-[state=active]:bg-white data-[state=active]:text-gray-900 dark:text-gray-200 dark:data-[state=active]:bg-gray-900 dark:data-[state=active]:text-gray-100',
	primary:
		'text-gray-700 data-[state=active]:bg-brand-200 data-[state=active]:text-brand-800 dark:text-gray-200 dark:data-[state=active]:bg-brand-500 dark:data-[state=active]:text-brand-50',
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
					'inline-flex items-center justify-center rounded-md border border-gray-75 bg-transparent p-1 dark:border-gray-850',
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
						'hover:data-[state=inactive]:bg-gray-75 dark:hover:data-[state=inactive]:bg-gray-850':
							activeOnHover,
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
		className={cn('mt-2 rounded-md border border-gray-200 p-6 dark:border-gray-700', className)}
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
