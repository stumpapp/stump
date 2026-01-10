/* eslint-disable @typescript-eslint/no-unused-vars */
import { cn, cx, Divider, Heading, Text } from '@stump/components'
import { forwardRef, PropsWithChildren, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkDirective from 'remark-directive'
import remarkDirectiveRehype from 'remark-directive-rehype'
import remarkGfm from 'remark-gfm'

type Props = {
	children: string
	className?: string
}

export default function MarkdownPreview({ children, className }: Props) {
	return (
		<ReactMarkdown
			remarkPlugins={[remarkDirective, remarkDirectiveRehype, remarkGfm]}
			rehypePlugins={[rehypeRaw]}
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
				h4: ({ ref: _, ...props }) => <Heading {...props} size="xs" />,
				h5: ({ ref: _, ...props }) => <Text {...props} className="font-medium" />,
				p: ({ ref: _, node: __, ...props }) => <Text {...props} />,
				table: Table,
				thead: Thead,
				tbody: Tbody,
				tr: Tr,
				td: Td,
				th: Th,

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

const Table = forwardRef<HTMLTableElement, PropsWithChildren>((props, ref) => {
	return (
		<div className="my-1 overflow-hidden rounded-xl border border-edge">
			<table ref={ref} {...props} className="w-full divide-y divide-edge" />
		</div>
	)
})
Table.displayName = 'MarkdownTable'

const Thead = forwardRef<HTMLTableSectionElement, PropsWithChildren>((props, ref) => {
	return <thead ref={ref} {...props} />
})
Thead.displayName = 'MarkdownTableHeader'

const Tbody = forwardRef<HTMLTableSectionElement, PropsWithChildren>((props, ref) => {
	return <tbody ref={ref} {...props} className="divide-y divide-edge" />
})
Tbody.displayName = 'MarkdownTableBody'

const Tr = forwardRef<HTMLTableRowElement, PropsWithChildren>((props, ref) => {
	return <tr ref={ref} {...props} className="w-fit divide-x divide-edge" />
})
Tr.displayName = 'MarkdownTableRow'

const Td = forwardRef<HTMLTableCellElement, PropsWithChildren>((props, ref) => {
	return <td ref={ref} {...props} className="py-2 pl-1.5 pr-1.5 first:pl-4 last:pr-4" />
})
Td.displayName = 'MarkdownTableCell'

const Th = forwardRef<HTMLTableCellElement, PropsWithChildren>((props, ref) => {
	return (
		<th
			ref={ref}
			{...props}
			className="relative h-8 bg-background-surface/50 pl-1.5 pr-1.5 text-left text-sm first:pl-4 last:pr-4"
		/>
	)
})
Th.displayName = 'MarkdownTableHeaderCell'
