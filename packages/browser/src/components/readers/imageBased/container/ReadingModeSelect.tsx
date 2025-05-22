import { Label, NativeSelect } from '@stump/components'
import { ReadingMode } from '@stump/graphql'
import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { useImageBaseReaderContext } from '../context'

export default function ReadingModeSelect() {
	const [search, setSearch] = useSearchParams()

	const { book, currentPage } = useImageBaseReaderContext()
	const {
		bookPreferences: { readingMode: currentMode },
		setBookPreferences,
	} = useBookPreferences({ book })

	/**
	 * A callback for actually changing the reading mode in the book preferences. Since
	 * the scroll-based readers do not track the current page in the URL, we need to set
	 * the page in the URL when changing from a continuous mode to a paged mode.
	 */
	const doChange = useCallback(
		(mode: ReadingMode) => {
			// We need to set the page in the URL for the paged reader to start at the correct
			// page but remove the page from the URL for the continuous readers
			const isCurrentlyScroll = currentMode !== ReadingMode.Paged
			const urlPage = isCurrentlyScroll ? currentPage.toString() : null

			if (urlPage) {
				search.set('page', urlPage)
			} else {
				search.delete('page')
			}

			setSearch(search)
			setBookPreferences({ readingMode: mode })
		},
		[currentMode, currentPage, search, setSearch, setBookPreferences],
	)
	/**
	 * A change handler for the reading mode select, asserting that the value
	 * is a valid {@link ReadingMode} before setting the reading mode in the book preferences.
	 */
	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			if (isReadingMode(e.target.value)) {
				doChange(e.target.value)
			} else {
				console.warn(`Invalid reading mode: ${e.target.value}`)
			}
		},
		[doChange],
	)

	return (
		<div className="py-1.5">
			<Label htmlFor="reading-mode">Mode</Label>
			<NativeSelect
				id="reading-mode"
				size="sm"
				options={[
					{ label: 'Vertical scroll', value: 'CONTINUOUS_VERTICAL' },
					{ label: 'Horizontal scroll', value: 'CONTINUOUS_HORIZONTAL' },
					{ label: 'Paged', value: 'PAGED' },
				]}
				value={currentMode}
				onChange={handleChange}
				className="mt-1.5"
			/>
		</div>
	)
}

/**
 * A type guard to ensure that the provided string is a valid {@link ReadingMode}.
 */
const isReadingMode = (mode: string): mode is ReadingMode =>
	mode === ReadingMode.Paged ||
	mode === ReadingMode.ContinuousHorizontal ||
	mode === ReadingMode.ContinuousVertical
