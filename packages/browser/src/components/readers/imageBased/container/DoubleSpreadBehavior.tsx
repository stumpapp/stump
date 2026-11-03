import { DoublePageBehavior, isDoublePageBehavior } from '@stump/client'
import { NativeSelect } from '@stump/components'
import React, { useCallback } from 'react'

import { useTranslate } from '@/hooks/useTranslate'

type Props = {
	behavior: DoublePageBehavior
	onChange: (behavior: DoublePageBehavior) => void
}

export default function DoubleSpreadBehavior({ behavior, onChange }: Props) {
	const { translate } = useTranslate()
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
		<div>
			<NativeSelect
				id="double-spread-behavior"
				aria-label={translate('shared.readerSettings.doublePageBehavior.label')}
				size="sm"
				options={[
					{
						label: translate('shared.readerSettings.doublePageBehavior.options.auto'),
						value: 'auto',
					},
					{
						label: translate('shared.readerSettings.doublePageBehavior.options.always'),
						value: 'always',
					},
					{
						label: translate('shared.readerSettings.doublePageBehavior.options.off'),
						value: 'off',
					},
				]}
				value={behavior}
				onChange={handleChange}
				className="mt-1.5"
			/>
		</div>
	)
}
