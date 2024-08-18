import { cx, Label, RawSwitch, Text } from '@stump/components'
import React from 'react'

type Props = {
	formId?: string
	label: string
	description: string
	isChecked?: boolean
	onToggle: () => void
	isDisabled?: boolean
	title?: string
}
export default function PreferenceToggle({
	formId,
	label,
	description,
	isChecked,
	onToggle,
	isDisabled,
	title,
}: Props) {
	return (
		<div className="flex items-center justify-between" title={title}>
			<div className="flex flex-grow flex-col gap-2 text-left">
				<Label
					htmlFor={formId}
					className={cx({ 'text-foreground-muted cursor-not-allowed select-none': isDisabled })}
				>
					{label}
				</Label>
				<Text
					size="sm"
					variant="muted"
					className={cx('max-w-[80%]', {
						'text-foreground-muted-200 cursor-not-allowed select-none': isDisabled,
					})}
				>
					{description}
				</Text>
			</div>

			<div className="w-6" />

			<RawSwitch
				id={formId}
				checked={isChecked}
				onClick={onToggle}
				primaryRing
				disabled={isDisabled}
				variant="primary"
			/>
		</div>
	)
}
