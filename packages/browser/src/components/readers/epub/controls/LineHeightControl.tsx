import { cx, IconButton, Label, TEXT_VARIANTS } from '@stump/components'
import { Minus, Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { useEpubReaderContext } from '../context'

export default function LineHeightControl() {
	const {
		readerMeta: { bookEntity },
	} = useEpubReaderContext()
	const {
		bookPreferences: { lineHeight = 1.5 },
		setBookPreferences,
	} = useBookPreferences({ book: bookEntity })

	const [localLineHeight, setLocalLineHeight] = useState(lineHeight)

	useEffect(() => {
		if (localLineHeight === lineHeight) return
		const bookPreferencesTimeout = setTimeout(() => {
			setBookPreferences({ lineHeight: localLineHeight })
		}, 0)
		return () => clearTimeout(bookPreferencesTimeout)
	}, [localLineHeight, lineHeight, setBookPreferences])

	const incrementLineHeight = useCallback((increment: number) => {
		setLocalLineHeight((currentHeight) => {
			const newHeight = Math.round((currentHeight + increment) * 10) / 10
			// Limit to reasonable minimum and maximum
			if (newHeight >= 1.0 && newHeight <= 3.0) return newHeight
			return currentHeight
		})
	}, [])

	return (
		<div className="gap-y-2.5 flex flex-col">
			<Label>Line height</Label>
			<div className="gap-x-2 flex items-center">
				<IconButton
					aria-label="Decrease line height"
					onClick={() => incrementLineHeight(-0.1)}
					variant="ghost"
					size="xs"
				>
					<Minus className="h-4 w-4" />
				</IconButton>
				<span className={cx('flex items-center justify-center', TEXT_VARIANTS.default)}>
					{localLineHeight.toFixed(1)}
				</span>
				<IconButton
					aria-label="Increase line height"
					onClick={() => incrementLineHeight(+0.1)}
					variant="ghost"
					size="xs"
				>
					<Plus className="h-4 w-4" />
				</IconButton>
			</div>
		</div>
	)
}
