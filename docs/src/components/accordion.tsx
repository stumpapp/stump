'use client'

import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button'
import { Check, LinkIcon } from 'lucide-react'
import { type ComponentProps, type ReactNode, useEffect, useRef, useState } from 'react'

import { cn } from '../lib/cn'
import { mergeRefs } from '../lib/merge-refs'
import {
	Accordion as Root,
	AccordionContent,
	AccordionHeader,
	AccordionItem,
	AccordionTrigger,
} from './ui/accordion'
import { buttonVariants } from './ui/button'

export function Accordions({
	type = 'single',
	ref,
	className,
	defaultValue,
	...props
}: ComponentProps<typeof Root>) {
	const rootRef = useRef<HTMLDivElement>(null)
	const composedRef = mergeRefs(ref, rootRef)
	const [value, setValue] = useState<string | string[]>(() =>
		type === 'single' ? (defaultValue ?? '') : (defaultValue ?? []),
	)

	useEffect(() => {
		const id = window.location.hash.substring(1)
		const element = rootRef.current
		if (!element || id.length === 0) return

		const selected = document.getElementById(id)
		if (!selected || !element.contains(selected)) return
		const value = selected.getAttribute('data-accordion-value')

		if (value) setValue((prev) => (typeof prev === 'string' ? value : [value, ...prev]))
	}, [])

	return (
		// @ts-expect-error -- Multiple types
		<Root
			type={type}
			ref={composedRef}
			value={value}
			onValueChange={setValue}
			collapsible={type === 'single' ? true : undefined}
			className={cn(
				'divide-fd-border rounded-lg bg-fd-card divide-y overflow-hidden border',
				className,
			)}
			{...props}
		/>
	)
}

export function Accordion({
	title,
	id,
	value = String(title),
	children,
	...props
}: Omit<ComponentProps<typeof AccordionItem>, 'value' | 'title'> & {
	title: string | ReactNode
	value?: string
}) {
	return (
		<AccordionItem value={value} {...props}>
			<AccordionHeader id={id} data-accordion-value={value}>
				<AccordionTrigger>{title}</AccordionTrigger>
				{id ? <CopyButton id={id} /> : null}
			</AccordionHeader>
			<AccordionContent>
				<div className="px-4 pb-2 prose-no-margin text-[0.9375rem]">{children}</div>
			</AccordionContent>
		</AccordionItem>
	)
}

function CopyButton({ id }: { id: string }) {
	const [checked, onClick] = useCopyButton(() => {
		const url = new URL(window.location.href)
		url.hash = id

		return navigator.clipboard.writeText(url.toString())
	})

	return (
		<button
			type="button"
			aria-label="Copy Link"
			className={cn(
				buttonVariants({
					color: 'ghost',
					className: 'text-fd-muted-foreground me-2',
				}),
			)}
			onClick={onClick}
		>
			{checked ? <Check className="size-3.5" /> : <LinkIcon className="size-3.5" />}
		</button>
	)
}
