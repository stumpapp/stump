import { useEpubReader } from '@stump/client'
import { cx, Label, Text, TEXT_VARIANTS } from '@stump/components'
import { Minus, Plus } from 'lucide-react'
import React from 'react'

export default function FontSizeControl() {
	const { fontSize, setFontSize } = useEpubReader((state) => ({
		fontSize: state.preferences.fontSize,
		setFontSize: state.setFontSize,
	}))

	const displayedFontSize = fontSize > 50 ? 50 : fontSize

	return (
		<div className="flex flex-col gap-y-2.5">
			<Label>Font size</Label>
			<div className="flex items-center gap-x-2">
				<button
					onClick={() => setFontSize(fontSize - 1)}
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
					onClick={() => setFontSize(fontSize + 1)}
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
