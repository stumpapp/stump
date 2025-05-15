import { cx, Label, TEXT_VARIANTS } from '@stump/components'
import { Minus, Plus } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'

import { usePressAndHold } from '@/hooks/usePressAndHold'
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
	const lineHeightRef = useRef(lineHeight)
	useEffect(() => {
		lineHeightRef.current = lineHeight
	}, [lineHeight])

	const handleSetLineHeight = useCallback(
		(newHeight: number) => {
			// Limit to reasonable minimum and maximum
			if (newHeight >= 1.0 && newHeight <= 3.0) {
				// Round to 1 decimal place for clean display
				setBookPreferences({ lineHeight: Math.round(newHeight * 10) / 10 })
			}
		},
		[setBookPreferences],
	)

	const { bindButton } = usePressAndHold()

	return (
		<div className="flex flex-col gap-y-2.5">
			<Label>Line height</Label>
			<div className="flex items-center gap-x-2">
				<button
					{...bindButton({
						callback: () => handleSetLineHeight(lineHeightRef.current - 0.1),
					})}
					className={cx('text-base', TEXT_VARIANTS.secondary)}
				>
					<Minus className="h-3 w-3" />
				</button>
				<span className={cx('flex items-center justify-center', TEXT_VARIANTS.default)}>
					{lineHeight.toFixed(1)}
				</span>
				<button
					{...bindButton({
						callback: () => handleSetLineHeight(lineHeightRef.current + 0.1),
					})}
					className={cx('text-base', TEXT_VARIANTS.secondary)}
				>
					<Plus className="h-3 w-3" />
				</button>
			</div>
		</div>
	)
}
