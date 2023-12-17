import { useEpubReader } from '@stump/client'
import { cx, Label, Text, TEXT_VARIANTS } from '@stump/components'
import { Minus, Plus } from 'lucide-react'
import React, { useCallback, useEffect, useRef } from 'react'

import { usePressAndHold } from '@/hooks/usePressAndHold'

export default function FontSizeControl() {
	const { fontSize, setFontSize } = useEpubReader((state) => ({
		fontSize: state.preferences.fontSize,
		setFontSize: state.setFontSize,
	}))
	const fontSizeRef = useRef(fontSize)
	useEffect(() => {
		fontSizeRef.current = fontSize
	}, [fontSize])

	const handleSetFontSize = useCallback(
		(newSize: number) => {
			if (newSize < 1) {
				return
			} else {
				setFontSize(newSize)
			}
		},
		[setFontSize],
	)

	const { bindButton } = usePressAndHold()

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
				<button
					{...bindButton({
						callback: () => handleSetFontSize(fontSizeRef.current - 1),
					})}
					className={cx('text-base', TEXT_VARIANTS.secondary)}
				>
					<Minus className="h-3 w-3" />
				</button>
				<span
					className={cx('flex items-center justify-center', TEXT_VARIANTS.default)}
					style={{ fontSize: `${displayedFontSize}px` }}
				>
					{fontSize}px
				</span>
				<button
					{...bindButton({
						callback: () => handleSetFontSize(fontSizeRef.current + 1),
					})}
					className={cx('text-base', TEXT_VARIANTS.secondary)}
				>
					<Plus className="h-3 w-3" />
				</button>
			</div>
			{fontSize > 50 && (
				<Text size="xs" className="text-left" variant="muted">
					Live font preview is capped at 50px
				</Text>
			)}
		</div>
	)
}
