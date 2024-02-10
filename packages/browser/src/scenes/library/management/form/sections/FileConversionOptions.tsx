import { CheckBox, Heading, Text } from '@stump/components'
import { useEffect } from 'react'
import { useFormContext } from 'react-hook-form'

import { Schema } from '../CreateOrUpdateLibraryForm'

export default function FileConversionOptions() {
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
		<div className="flex flex-col gap-y-6">
			<div className="flex flex-col gap-y-1.5">
				<Heading size="sm">Converting options</Heading>
				<Text size="sm" variant="muted">
					Stump is capable of converting certain file formats to more compatible ones
				</Text>
			</div>

			<CheckBox
				variant="primary"
				label="Convert RAR files to ZIP"
				checked={convertRarToZip}
				onClick={() => form.setValue('convert_rar_to_zip', !convertRarToZip)}
				description="Any RAR files found in your library will be converted to ZIP files. Support is generally better for ZIP files"
				{...form.register('convert_rar_to_zip')}
			/>

			<CheckBox
				variant="primary"
				label="Delete RAR files after conversion"
				checked={hardDeleteConversions}
				disabled={!convertRarToZip}
				onClick={() => form.setValue('hard_delete_conversions', !hardDeleteConversions)}
				description="RAR files will be deleted after conversion. This is useful if you want to save space, but you will not be able to restore the originals"
				{...form.register('hard_delete_conversions')}
			/>
		</div>
	)
}
