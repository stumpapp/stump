import { Button, Input, Popover } from '@stump/components'
import { ChevronsRight } from 'lucide-react'
import { ChangeEvent, KeyboardEvent, useState } from 'react'

export type GoToPageProps = {
	/**
	 * The page the reader is currently on (1-indexed).
	 */
	currentPage: number
	/**
	 * The total number of pages in the book.
	 */
	totalPages: number
	/**
	 * Called with a validated, clamped page number when the user submits a jump.
	 * This is intended to be wired to the reader's existing `setCurrentPage`.
	 */
	onSubmit: (page: number) => void
	/**
	 * Localized label for the input. Passed in so this component stays locale-agnostic
	 * and trivially testable. Defaults are placeholders until i18n is wired (Increment 3).
	 */
	label?: string
	/**
	 * Localized text for the submit button.
	 */
	submitLabel?: string
}

/**
 * Clamp a requested page into the valid 1..totalPages range.
 *
 * Exported separately so the validation rule can be unit-tested without rendering.
 */
export const clampPage = (value: number, totalPages: number): number =>
	Math.min(Math.max(1, value), Math.max(1, totalPages))

/**
 * A small control that lets the reader jump directly to an arbitrary page. This is a
 * manual-recovery affordance: if reading position is ever lost, the user can type the
 * page they remember and return to it immediately.
 *
 * NOTE: This component is intentionally "dumb" — it owns no reader state and performs
 * no navigation itself. The parent supplies `currentPage`/`totalPages` and binds
 * `onSubmit` to the reader's existing page-change handler.
 */
export default function GoToPage({
	currentPage,
	totalPages,
	onSubmit,
	label = 'Go to page',
	submitLabel = 'Go',
}: GoToPageProps) {
	const [open, setOpen] = useState(false)
	const [value, setValue] = useState(() => String(currentPage))

	const handleOpenChange = (next: boolean) => {
		// Re-seed the input with the live current page whenever the popover opens, so a
		// stale value from a previous jump isn't shown.
		if (next) {
			setValue(String(currentPage))
		}
		// eslint-disable-next-line no-console
		console.debug(`[GoToPage] popover ${next ? 'opened' : 'closed'} (current=${currentPage})`)
		setOpen(next)
	}

	const handleSubmit = () => {
		const parsed = parseInt(value, 10)
		if (Number.isNaN(parsed)) {
			// eslint-disable-next-line no-console
			console.debug(`[GoToPage] ignoring non-numeric input: "${value}"`)
			return
		}

		const target = clampPage(parsed, totalPages)
		// eslint-disable-next-line no-console
		console.debug(`[GoToPage] jump requested=${parsed} clamped=${target} of ${totalPages}`)
		onSubmit(target)
		setOpen(false)
	}

	const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
		setValue(e.target.value)
	}

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') {
			e.preventDefault()
			handleSubmit()
		}
	}

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<Popover.Trigger asChild>
				<button
					type="button"
					className="text-sm text-gray-450 underline-offset-2 hover:underline"
					aria-label={label}
				>
					{currentPage} of {totalPages}
				</button>
			</Popover.Trigger>

			<Popover.Content size="sm" className="gap-2 p-3 flex items-end">
				<Input
					label={label}
					type="number"
					min={1}
					max={totalPages}
					value={value}
					onChange={handleChange}
					onKeyDown={handleKeyDown}
					fullWidth
					autoFocus
				/>
				<Button size="sm" onClick={handleSubmit}>
					<ChevronsRight className="mr-1 h-4 w-4" />
					{submitLabel}
				</Button>
			</Popover.Content>
		</Popover>
	)
}
