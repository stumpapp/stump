import { cn, useBoolean } from '@stump/components'
import { memo, useId, useMemo } from 'react'

import { DEBUG_ENV } from '../index.ts'
import Markdown from './markdown/MarkdownPreview.tsx'

type Props = {
	text?: string | null
	muted?: boolean
}

const COLLAPSED_HEIGHT = 72

// Memoized so toggling expanded/collapsed doesn't re-parse (and visibly
// re-render/flicker) potentially large markdown descriptions.
const MemoizedMarkdown = memo(Markdown)

export default function ReadMore({ text, muted }: Props) {
	const [showingAll, { toggle }] = useBoolean(false)
	const contentId = useId()

	const resolvedText = text ? text : DEBUG_ENV ? DEBUG_FAKE_TEXT : ''
	const canReadMore = resolvedText.length > 250
	const markdownClassName = useMemo(() => cn({ 'opacity-80': muted }), [muted])

	const content = useMemo(
		() => <MemoizedMarkdown className={markdownClassName}>{resolvedText}</MemoizedMarkdown>,
		[markdownClassName, resolvedText],
	)

	if (!resolvedText && !DEBUG_ENV) {
		return null
	}

	if (!canReadMore) {
		return content
	}

	return (
		<div>
			<div
				id={contentId}
				className={cn(!showingAll && 'overflow-hidden')}
				style={
					showingAll
						? { overflowAnchor: 'none' }
						: { maxHeight: COLLAPSED_HEIGHT, overflowAnchor: 'none' }
				}
			>
				{content}
			</div>

			{!showingAll && (
				<div
					aria-hidden
					className="-mt-8 h-8 pointer-events-none bg-linear-to-t from-background to-transparent"
				/>
			)}

			<div className="mt-2 relative flex w-full items-center">
				<div className="flex-1 border-t border-dashed border-border" />
				<button
					type="button"
					onClick={toggle}
					aria-expanded={showingAll}
					aria-controls={contentId}
					className="px-3 py-0.5 text-xs font-medium cursor-pointer rounded-full border border-dashed border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
				>
					{showingAll ? 'Read less' : 'Read more'}
				</button>
				<div className="flex-1 border-t border-dashed border-border" />
			</div>
		</div>
	)
}

const DEBUG_FAKE_TEXT =
	'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed varius semper dolor, eget egestas velit porta ut. \
	Integer blandit lectus nisi, a suscipit eros malesuada eu. Praesent vel sodales ipsum, ut porttitor erat. Aliquam faucibus erat a ante \
	consectetur imperdiet. Curabitur in est ac nisi feugiat facilisis a in nisi. Ut auctor rutrum nibh a tincidunt. Proin non hendrerit risus, \
	sagittis malesuada odio. Phasellus condimentum hendrerit libero nec ultrices.\
	Praesent lacinia, magna vel sodales tempus, tellus metus ultricies odio, non porttitor lectus tortor ac ante. \
	Nullam malesuada nec massa eget facilisis. Aenean in nisi lacus. Etiam et tortor vel lacus maximus imperdiet. Fusce \
	scelerisque dapibus fermentum. Nunc non mauris rhoncus neque tincidunt convallis id et nisl. Donec lobortis at lectus quis venenatis. \
	Ut lacus urna, accumsan sed nisl eget, auctor auctor massa. Duis scelerisque aliquam scelerisque. In hac habitasse platea dictumst. Suspendisse \
	consequat nisi nec enim finibus, sit amet gravida sem ultrices. Vestibulum feugiat erat et tincidunt pellentesque. Sed interdum mi ac quam convallis lobortis.'
