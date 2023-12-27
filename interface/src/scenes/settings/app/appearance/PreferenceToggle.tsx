import { cx, Label, RawSwitch, Text } from '@stump/components'
import React from 'react'

type Props = {
	formId?: string
	label: string
	description: string
	isChecked?: boolean
	onToggle: () => void
	isDisabled?: boolean
}
export default function PreferenceToggle({
	formId,
	label,
	description,
	isChecked,
	onToggle,
	isDisabled,
}: Props) {
	return (
		<div className="flex items-center justify-between">
			<div className="flex flex-grow flex-col gap-2 text-left">
				<Label
					htmlFor={formId}
					className={cx({ 'cursor-not-allowed select-none text-muted': isDisabled })}
				>
					{label}
				</Label>
				<Text
					size="sm"
					variant="muted"
					className={cx('max-w-[80%]', {
						'cursor-not-allowed select-none text-muted-200': isDisabled,
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
