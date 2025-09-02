import { cx, IconButton, Label, TEXT_VARIANTS } from '@stump/components'
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

	const { bindButton: bindMinus, isHolding: isHoldingMinus } = usePressAndHold()
	const { bindButton: bindPlus, isHolding: isHoldingPlus } = usePressAndHold()

	return (
		<div className="flex flex-col gap-y-2.5">
			<Label>Line height</Label>
			<div className="flex items-center gap-x-2">
				<IconButton
					{...bindMinus({
						callback: () => handleSetLineHeight(lineHeightRef.current - 0.1),
					})}
					variant="ghost"
					size="xs"
					className={isHoldingMinus ? 'select-none bg-background-surface-hover' : ''}
				>
					<Minus className="h-4 w-4" />
				</IconButton>
				<span className={cx('flex items-center justify-center', TEXT_VARIANTS.default)}>
					{lineHeight.toFixed(1)}
				</span>
				<IconButton
					{...bindPlus({
						callback: () => handleSetLineHeight(lineHeightRef.current + 0.1),
					})}
					variant="ghost"
					size="xs"
					className={isHoldingPlus ? 'select-none bg-background-surface-hover' : ''}
				>
					<Plus className="h-4 w-4" />
				</IconButton>
			</div>
		</div>
	)
}
