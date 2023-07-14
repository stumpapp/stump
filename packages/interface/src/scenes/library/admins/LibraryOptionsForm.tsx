import { Divider, Heading, Switch, Text } from '@stump/components'
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
		<div className="py-2">
			<Heading size="xs">Library Options</Heading>
			<Text size="sm" variant="muted" className="mt-1.5">
				The following options are configurable for your library and affect how it is scanned.
			</Text>

			<Divider variant="muted" className="my-3.5" />

			{isCreatingLibrary && <LibraryPatternRadioGroup />}

			{/* TODO: I think these are better as checkboxes eventually */}
			<div className="flex flex-auto gap-12 pt-4">
				<Switch
					variant="primary"
					checked={convertRarToZip}
					label="Convert RAR files to ZIP"
					onClick={() => form.setValue('convert_rar_to_zip', !convertRarToZip)}
					{...form.register('convert_rar_to_zip')}
				/>
				<Switch
					variant="primary"
					checked={hardDeleteConversions}
					disabled={!convertRarToZip}
					label="Delete RAR files after conversion"
					onClick={() => form.setValue('hard_delete_conversions', !hardDeleteConversions)}
					{...form.register('hard_delete_conversions')}
				/>
			</div>
		</div>
	)
}
