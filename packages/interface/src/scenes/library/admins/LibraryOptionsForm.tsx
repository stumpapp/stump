import { CheckBox } from '@stump/components'
import { useEffect } from 'react'
import { useFormContext } from 'react-hook-form'

import { type Schema } from './CreateOrEditLibraryForm'
import LibraryPatternRadioGroup from './LibraryPatternRadioGroup'

type Props = {
	isCreatingLibrary: boolean
}
export default function LibraryOptionsForm({ isCreatingLibrary }: Props) {
	const form = useFormContext<Schema>()

	const [convertRarToZip, hardDeleteConversions] = form.watch([
		'convert_rar_to_zip',
		'hard_delete_conversions',
	])

	useEffect(
		() => {
			if (!convertRarToZip && hardDeleteConversions) {
				form.setValue('hard_delete_conversions', false)
			}
		},

		// eslint-disable-next-line react-hooks/exhaustive-deps
		[convertRarToZip, hardDeleteConversions],
	)

	return (
		<div className="pb-6">
			{isCreatingLibrary && <LibraryPatternRadioGroup />}

			<div className="flex flex-auto gap-12 pt-6">
				<CheckBox
					variant="primary"
					label="Convert RAR files to ZIP"
					checked={convertRarToZip}
					onClick={() => form.setValue('convert_rar_to_zip', !convertRarToZip)}
					{...form.register('convert_rar_to_zip')}
				/>
				<CheckBox
					variant="primary"
					label="Delete RAR files after conversion"
					checked={hardDeleteConversions}
					disabled={!convertRarToZip}
					onClick={() => form.setValue('hard_delete_conversions', !hardDeleteConversions)}
					{...form.register('hard_delete_conversions')}
				/>
			</div>
		</div>
	)
}
