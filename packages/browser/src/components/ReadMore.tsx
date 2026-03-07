import { useBoolean } from '@stump/components'
import { AnimatePresence, motion } from 'framer-motion'
import { useRef, useState } from 'react'

import { DEBUG_ENV } from '../index.ts'
import Markdown from './markdown/MarkdownPreview.tsx'

type Props = {
	text?: string | null
}

export default function ReadMore({ text }: Props) {
	const [showingAll, { toggle }] = useBoolean(false)
	const contentRef = useRef<HTMLDivElement>(null)
	const [expandedHeight, setExpandedHeight] = useState<number | 'auto'>('auto')

	const resolvedText = text ? text : DEBUG_ENV ? DEBUG_FAKE_TEXT : ''
	const canReadMore = resolvedText.length > 250

	const handleToggle = () => {
		if (!showingAll && contentRef.current) {
			setExpandedHeight(Math.min(contentRef.current.scrollHeight, 300))
		}
		toggle()
	}

	if (!resolvedText && !DEBUG_ENV) {
		return null
	}

	if (!canReadMore) {
		return <Markdown>{resolvedText}</Markdown>
	}

	const collapsedHeight = 72

	return (
		<div>
			<motion.div
				ref={contentRef}
				initial={false}
				animate={{ height: showingAll ? expandedHeight : collapsedHeight }}
				transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
				// @ts-expect-error: it does exist lol
				className="overflow-hidden"
			>
				<Markdown>{resolvedText}</Markdown>
			</motion.div>

			<AnimatePresence mode="wait">
				{!showingAll && (
					<motion.div
						key="fade"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.15 }}
						// @ts-expect-error: it does exist lol
						className="pointer-events-none -mt-8 h-8 bg-gradient-to-t from-background to-transparent"
					/>
				)}
			</AnimatePresence>

			<div className="relative mt-2 flex w-full items-center">
				<div className="flex-1 border-t border-dashed border-edge" />
				<button
					onClick={handleToggle}
					className="cursor-pointer rounded-full border border-dashed border-edge bg-background px-3 py-0.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-background-surface hover:text-foreground"
				>
					{showingAll ? 'Read less' : 'Read more'}
				</button>
				<div className="flex-1 border-t border-dashed border-edge" />
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
