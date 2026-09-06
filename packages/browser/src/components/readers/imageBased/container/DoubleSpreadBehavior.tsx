import { DoublePageBehavior, isDoublePageBehavior } from '@stump/client'
import { Label, NativeSelect } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import React, { useCallback } from 'react'

type Props = {
	behavior: DoublePageBehavior
	onChange: (behavior: DoublePageBehavior) => void
}

export default function DoubleSpreadBehavior({ behavior, onChange }: Props) {
	const { t } = useLocaleContext()
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
			<Label htmlFor="double-spread-behavior">
				{t('imageReader.settings.doublePageBehavior.label')}
			</Label>
			<NativeSelect
				id="double-spread-behavior"
				size="sm"
				options={[
					{
						label: t('imageReader.settings.doublePageBehavior.options.auto'),
						value: 'auto',
					},
					{
						label: t('imageReader.settings.doublePageBehavior.options.always'),
						value: 'always',
					},
					{
						label: t('imageReader.settings.doublePageBehavior.options.off'),
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
