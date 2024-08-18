/* eslint-disable react/prop-types */

import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { ChevronDownIcon } from 'lucide-react'
import * as React from 'react'

import { cn } from '../utils'

const Accordion = AccordionPrimitive.Root

const AccordionItem = React.forwardRef<
	React.ElementRef<typeof AccordionPrimitive.Item>,
	React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
	<AccordionPrimitive.Item ref={ref} className={cn('border-b border-edge', className)} {...props} />
))
AccordionItem.displayName = 'AccordionItem'

type TriggerProps = {
	noUnderline?: boolean
	asLabel?: boolean
} & React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
const AccordionTrigger = React.forwardRef<
	React.ElementRef<typeof AccordionPrimitive.Trigger>,
	TriggerProps
>(({ className, children, noUnderline, asLabel, ...props }, ref) => (
	<AccordionPrimitive.Header className="flex">
		<AccordionPrimitive.Trigger
			ref={ref}
			className={cn(
				'flex flex-1 items-center justify-between py-4 text-sm font-medium transition-all [&[data-state=open]>svg]:rotate-180',
				{
					'text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70':
						asLabel,
				},
				{ 'hover:underline': !noUnderline },
				className,
			)}
			{...props}
		>
			{children}
			<ChevronDownIcon className="h-4 w-4 shrink-0 text-foreground-muted transition-transform duration-200" />
		</AccordionPrimitive.Trigger>
	</AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

// TODO: variant for no or quickened animation
type ContentProps = {
	containerClassName?: string
} & React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
const AccordionContent = React.forwardRef<
	React.ElementRef<typeof AccordionPrimitive.Content>,
	ContentProps
>(({ className, children, containerClassName, ...props }, ref) => (
	<AccordionPrimitive.Content
		ref={ref}
		className={cn(
			'overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down',
			className,
		)}
		{...props}
	>
		<div className={cn('pb-4 pt-0', containerClassName)}>{children}</div>
	</AccordionPrimitive.Content>
))
AccordionContent.displayName = AccordionPrimitive.Content.displayName

type AccordionSubComponents = {
	Item: typeof AccordionItem
	Trigger: typeof AccordionTrigger
	Content: typeof AccordionContent
}
const TypedAccordion = Accordion as typeof Accordion & AccordionSubComponents
TypedAccordion.Item = AccordionItem
TypedAccordion.Trigger = AccordionTrigger
TypedAccordion.Content = AccordionContent

export { TypedAccordion as Accordion }
