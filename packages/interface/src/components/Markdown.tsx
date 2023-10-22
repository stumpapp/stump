import { cn } from '@stump/components'
import React from 'react'
// @ts-expect-error: TODO: fix resolution issues...
import ReactMarkdown from 'react-markdown'
// @ts-expect-error: TODO: fix resolution issues...
import remarkGfm from 'remark-gfm'

type Props = {
	children: string
	className?: string
}

// TODO: better darkmode support, unfortunately requires overriding lots o' tags
// TODO: editing? (probably not using this component)
export default function Markdown({ children, className }: Props) {
	// TODO: support spoiler!
	return (
		<ReactMarkdown remarkPlugins={[[remarkGfm]]} className={cn('dark:text-gray-100', className)}>
			{children}
		</ReactMarkdown>
	)
}
