import { useBoolean } from '@stump/components'

import { DEBUG_ENV } from '../index.ts'
import Markdown from './markdown/MarkdownPreview.tsx'

type Props = {
	text?: string | null
}

const COLLAPSED_HEIGHT = 72
const MAX_EXPANDED_HEIGHT = 300

export default function ReadMore({ text }: Props) {
	const [showingAll, { toggle }] = useBoolean(false)

	const resolvedText = text ? text : DEBUG_ENV ? DEBUG_FAKE_TEXT : ''
	const canReadMore = resolvedText.length > 250

	if (!resolvedText && !DEBUG_ENV) {
		return null
	}

	if (!canReadMore) {
		return <Markdown>{resolvedText}</Markdown>
	}

	return (
		<div>
			<div
				className={showingAll ? 'overflow-y-auto' : 'overflow-hidden'}
				style={{
					maxHeight: showingAll ? MAX_EXPANDED_HEIGHT : COLLAPSED_HEIGHT,
					transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
				}}
			>
				<Markdown>{resolvedText}</Markdown>
			</div>

			<div
				className="pointer-events-none -mt-8 h-8 bg-gradient-to-t from-background to-transparent transition-opacity duration-150"
				style={{ opacity: showingAll ? 0 : 1 }}
			/>

			<div className="relative mt-2 flex w-full items-center">
				<div className="flex-1 border-t border-dashed border-edge" />
				<button
					onClick={toggle}
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
