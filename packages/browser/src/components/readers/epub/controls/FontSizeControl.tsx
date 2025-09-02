import { cx, IconButton, Label, Text, TEXT_VARIANTS } from '@stump/components'
import { Minus, Plus } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'

import { usePressAndHold } from '@/hooks/usePressAndHold'
import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { useEpubReaderContext } from '../context'

export default function FontSizeControl() {
	const {
		readerMeta: { bookEntity },
	} = useEpubReaderContext()
	const {
		bookPreferences: { fontSize = 13 },
		setBookPreferences,
	} = useBookPreferences({ book: bookEntity })
	const fontSizeRef = useRef(fontSize)
	useEffect(() => {
		fontSizeRef.current = fontSize
	}, [fontSize])

	const handleSetFontSize = useCallback(
		(newSize: number) => {
			if (newSize < 1) {
				return
			} else {
				setBookPreferences({ fontSize: newSize })
			}
		},
		[setBookPreferences],
	)

	const { bindButton: bindMinus, isHolding: isHoldingMinus } = usePressAndHold()
	const { bindButton: bindPlus, isHolding: isHoldingPlus } = usePressAndHold()

	/**
	 * Used to preview the font size as it will be displayed in the reader. The max
	 * font size for the preview is 50px. However, there is no limit to the font size
	 * that can be set on the upper bound. The lower bound is 1px.
	 */
	const displayedFontSize = fontSize > 50 ? 50 : fontSize

	return (
		<div className="flex flex-col gap-y-2.5">
			<Label>Font size</Label>
			<div className="flex items-center gap-x-2">
				<IconButton
					{...bindMinus({
						callback: () => handleSetFontSize(fontSizeRef.current - 1),
					})}
					variant="ghost"
					size="xs"
					className={isHoldingMinus ? 'select-none bg-background-surface-hover' : ''}
				>
					<Minus className="h-4 w-4" />
				</IconButton>
				<span
					className={cx('flex items-center justify-center', TEXT_VARIANTS.default)}
					style={{ fontSize: `${displayedFontSize}px` }}
				>
					{fontSize}px
				</span>
				<IconButton
					{...bindPlus({
						callback: () => handleSetFontSize(fontSizeRef.current + 1),
					})}
					variant="ghost"
					size="xs"
					className={isHoldingPlus ? 'select-none bg-background-surface-hover' : ''}
				>
					<Plus className="h-4 w-4" />
				</IconButton>
			</div>
			{fontSize > 50 && (
				<Text size="xs" className="text-left" variant="muted">
					Live font preview is capped at 50px
				</Text>
			)}
		</div>
	)
}
