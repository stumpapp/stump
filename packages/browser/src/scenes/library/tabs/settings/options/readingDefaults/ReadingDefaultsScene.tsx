import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Form } from '@stump/components'
import { useCallback, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useDebouncedValue } from 'rooks'

import {
	buildSchema,
	CreateOrUpdateLibrarySchema,
	DefaultReadingSettings,
	formDefaults,
} from '@/components/library/createOrUpdate'

import { useLibraryManagement } from '../../context'

type PatchParams = Partial<
	Pick<
		CreateOrUpdateLibrarySchema,
		'default_reading_dir' | 'default_reading_image_scale_fit' | 'default_reading_mode'
	>
>

export default function ReadingDefaultsScene() {
	const { library, patch } = useLibraryManagement()

	const handleSubmit = useCallback(
		(params: PatchParams) => {
			patch({
				config: {
					...library.config,
					...params,
				},
				scan_mode: 'NONE',
			})
		},
		[patch, library.config],
	)

	const form = useForm<PatchParams>({
		defaultValues: formDefaults(library),
		resolver: zodResolver(buildSchema([], library)),
	})

	const formValues = form.watch([
		'default_reading_dir',
		'default_reading_image_scale_fit',
		'default_reading_mode',
	])
	const didChange = useMemo(() => {
		const config = library.config
		const [dir, scale, mode] = formValues
		return (
			config.default_reading_dir !== dir ||
			config.default_reading_image_scale_fit !== scale ||
			config.default_reading_mode !== mode
		)
	}, [formValues, library])
	const [debouncedDidChange] = useDebouncedValue(didChange, 500)

	useEffect(() => {
		if (debouncedDidChange) {
			const el = document.getElementById('save-changes')
			if (el) {
				el.click()
			}
		}
	}, [debouncedDidChange])

	return (
		<Form
			id="reading-defaults"
			fieldsetClassName="flex flex-col gap-12 md:max-w-xl"
			form={form}
			onSubmit={handleSubmit}
		>
			<DefaultReadingSettings />

			<div className="invisible hidden">
				<Button id="save-changes" type="submit">
					Save changes
				</Button>
			</div>
		</Form>
	)
}
