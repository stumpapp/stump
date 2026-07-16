import { cx } from '@stump/components'
import { Highlighter, NotebookPen } from 'lucide-react'

type Rect = { x: number; y: number; width: number; height: number }

type Props = {
	rect: Rect
	onHighlight: () => void
	onAddNote: () => void
	className?: string
}

const TOOLBAR_OFFSET_PX = 8

/**
 * Floating toolbar shown near an active text selection inside the Readium navigator.
 * `rect` is expected in viewport coordinates (see `ReadiumWebReader`'s conversion from
 * the iframe-relative `BasicTextSelection`).
 */
export default function SelectionToolbar({ rect, onHighlight, onAddNote, className }: Props) {
	return (
		<div
			role="toolbar"
			aria-label="Selection actions"
			className={cx(
				'gap-1 p-1 shadow-lg fixed z-50 flex items-center rounded-md border border-border bg-background',
				className,
			)}
			style={{
				left: rect.x + rect.width / 2,
				top: Math.max(0, rect.y - TOOLBAR_OFFSET_PX),
				transform: 'translate(-50%, -100%)',
			}}
		>
			<button
				type="button"
				className="gap-1.5 px-2 py-1.5 text-sm flex items-center rounded-sm text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				onClick={onHighlight}
			>
				<Highlighter className="h-4 w-4" />
				Highlight
			</button>

			<button
				type="button"
				className="gap-1.5 px-2 py-1.5 text-sm flex items-center rounded-sm text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				onClick={onAddNote}
			>
				<NotebookPen className="h-4 w-4" />
				Add note
			</button>
		</div>
	)
}
