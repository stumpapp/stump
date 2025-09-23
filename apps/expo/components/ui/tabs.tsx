import * as TabsPrimitive from '@rn-primitives/tabs'
import * as React from 'react'

import { TextClassContext } from '~/components/ui/text'
import { cn } from '~/lib/utils'

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<TabsPrimitive.ListRef, TabsPrimitive.ListProps>(
	({ className, ...props }, ref) => (
		<TabsPrimitive.List
			ref={ref}
			className={cn(
				'web:inline-flex native:h-12 native:px-1.5 squircle h-10 items-center justify-center rounded-lg bg-background-surface p-1 tablet:h-14',
				className,
			)}
			{...props}
		/>
	),
)
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<TabsPrimitive.TriggerRef, TabsPrimitive.TriggerProps>(
	({ className, ...props }, ref) => {
		const { value } = TabsPrimitive.useRootContext()
		return (
			<TextClassContext.Provider
				value={cn(
					'text-sm native:text-base font-medium text-foreground-muted web:transition-all',
					value === props.value && 'text-foreground',
				)}
			>
				<TabsPrimitive.Trigger
					ref={ref}
					className={cn(
						'web:whitespace-nowrap web:ring-offset-background web:transition-all web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-ring web:focus-visible:ring-offset-2 squircle inline-flex items-center justify-center rounded-lg border border-transparent px-3 py-1.5 text-sm font-medium',
						props.disabled && 'web:pointer-events-none opacity-50',
						props.value === value && 'border-edge bg-background-surface-secondary',
						className,
					)}
					{...props}
				/>
			</TextClassContext.Provider>
		)
	},
)
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<TabsPrimitive.ContentRef, TabsPrimitive.ContentProps>(
	({ className, ...props }, ref) => (
		<TabsPrimitive.Content
			ref={ref}
			className={cn(
				'web:ring-offset-background web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-ring web:focus-visible:ring-offset-2',
				className,
			)}
			{...props}
		/>
	),
)
TabsContent.displayName = TabsPrimitive.Content.displayName

type TypedTabs = typeof Tabs & {
	Content: typeof TabsContent
	List: typeof TabsList
	Trigger: typeof TabsTrigger
}

const TypedTabs = Tabs as TypedTabs
TypedTabs.Content = TabsContent
TypedTabs.List = TabsList
TypedTabs.Trigger = TabsTrigger

export { TypedTabs as Tabs }
