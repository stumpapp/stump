import { Button, Input, Label, Popover } from '@stump/components'
import { ChangeEvent, KeyboardEvent, useState } from 'react'

export type GoToPageProps = {
	// The page the reader is currently on //
	currentPage: number
	//The total number of pages in the book //
	totalPages: number
	/**
	 * Called with a validated, clamped page number when the user submits a jump.
	 * This is intended to be wired to the reader's existing `setCurrentPage`.
	 */
	onSubmit: (page: number) => void
	/**
	 * Label for the input. Passed in so this component stays presentation-agnostic and
	 * trivially testable. Defaults to English to match the rest of the (currently
	 * unlocalized) image reader; can be swapped for a t(...) string once the reader is
	 * localized as a whole.
	 */
	label?: string
	//Text for the submit button. See `label` re: localization //
	submitLabel?: string
	/**
	 * Optional text to show on the trigger. Lets the parent preserve its existing page
	 * display (e.g. a "4-5 of 42" page-set range) instead of the default single page.
	 */
	triggerLabel?: string
}

/**
 * Clamp a requested page into the valid 1..totalPages range.
 *
 * Exported separately so the validation rule can be unit-tested without rendering.
 */
export const clampPage = (value: number, totalPages: number): number =>
	Math.min(Math.max(1, value), Math.max(1, totalPages))

/**
 * A small control that lets the reader jump directly to an arbitrary page
 */
export default function GoToPage({
	currentPage,
	totalPages,
	onSubmit,
	label = 'Go to page',
	submitLabel = 'Go',
	triggerLabel,
}: GoToPageProps) {
	const [open, setOpen] = useState(false)
	const [value, setValue] = useState(() => String(currentPage))

	const handleOpenChange = (next: boolean) => {
		// Re-seed the input with the live current page whenever the popover opens, so a
		// stale value from a previous jump isn't shown.
		if (next) {
			setValue(String(currentPage))
		}
		setOpen(next)
	}

	const handleSubmit = () => {
		const parsed = parseInt(value, 10)
		// Ignore anything that isn't a number.
		if (Number.isNaN(parsed)) {
			return
		}

		onSubmit(clampPage(parsed, totalPages))
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
					{triggerLabel ?? `${currentPage} of ${totalPages}`}
				</button>
			</Popover.Trigger>

			<Popover.Content size="sm" className="gap-2 p-3 flex flex-col">
				{/* The label sits atop input/button group so it doesn't throw off the
				    alignment of row below. */}
				<Label htmlFor="go-to-page-input">{label}</Label>
				<div className="gap-2 flex items-center">
					<Input
						id="go-to-page-input"
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
						{submitLabel}
					</Button>
				</div>
			</Popover.Content>
		</Popover>
	)
}
