import { DoublePageBehavior, isDoublePageBehavior } from '@stump/client'
import { Label, NativeSelect } from '@stump/components'
import React, { useCallback } from 'react'

type Props = {
	behavior: DoublePageBehavior
	onChange: (behavior: DoublePageBehavior) => void
}

export default function DoubleSpreadBehavior({ behavior, onChange }: Props) {
	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			if (isDoublePageBehavior(e.target.value)) {
				onChange(e.target.value)
			} else {
				console.warn(`Invalid double page behavior: ${e.target.value}`)
			}
		},
		[onChange],
	)

	return (
		<div className="py-1.5">
			<Label htmlFor="double-spread-behavior">Double Paged</Label>
			<NativeSelect
				id="double-spread-behavior"
				size="sm"
				options={[
					{ label: 'Auto', value: 'auto' },
					{ label: 'Always', value: 'always' },
					{ label: 'Off', value: 'off' },
				]}
				value={behavior}
				onChange={handleChange}
				className="mt-1.5"
			/>
		</div>
	)
}
