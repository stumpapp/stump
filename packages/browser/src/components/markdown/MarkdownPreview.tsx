/* eslint-disable @typescript-eslint/no-unused-vars */
import { cn, cx, Divider, Heading, Text } from '@stump/components'
import React, { PropsWithChildren, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkDirective from 'remark-directive'
import remarkDirectiveRehype from 'remark-directive-rehype'

type Props = {
	children: string
	className?: string
}

export default function MarkdownPreview({ children, className }: Props) {
	return (
		<ReactMarkdown
			remarkPlugins={[remarkDirective, remarkDirectiveRehype]}
			className={cn('text-foreground-subtle', className)}
			components={{
				h1: ({ ref: _, ...props }) => (
					<>
						<Heading {...props} size="xl" />
						<Divider className="my-1" variant="muted" />
					</>
				),
				h2: ({ ref: _, ...props }) => <Heading {...props} size="lg" />,
				h3: ({ ref: _, ...props }) => <Heading {...props} size="md" />,
				h4: ({ ref: _, ...props }) => <Heading {...props} size="sm" />,
				h5: ({ ref: _, ...props }) => <Heading {...props} size="xs" />,
				p: ({ ref: _, node: __, ...props }) => <Text {...props} />,
				// @ts-expect-error: this is a custom component
				spoiler: Spoiler,
				'youtube-video': YouTubeVideo,
			}}
		>
			{children}
		</ReactMarkdown>
	)
}

const YouTubeVideo = ({ id, children }: PropsWithChildren<{ id: string }>) => (
	<iframe src={'https://www.youtube.com/embed/' + id} width="200" height="200">
		{children}
	</iframe>
)

/**
 * A spoiler component, e.g. :spoiler[hidden text]
 */
const Spoiler = ({ children }: PropsWithChildren) => {
	const [isSpoiler, setIsSpoiler] = useState(true)

	return (
		<span
			className={cx(
				{
					'cursor-pointer bg-gray-800 text-gray text-opacity-0': isSpoiler,
				},
				{
					'bg-background bg-opacity-10': !isSpoiler,
				},
			)}
			onClick={() => setIsSpoiler(!isSpoiler)}
			title={isSpoiler ? 'Click to reveal' : 'Click to hide'}
		>
			{children}
		</span>
	)
}
