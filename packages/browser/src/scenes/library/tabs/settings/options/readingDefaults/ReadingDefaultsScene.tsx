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
		'defaultReadingDir' | 'defaultReadingImageScaleFit' | 'defaultReadingMode'
	>
>

export default function ReadingDefaultsScene() {
	const { library, patch } = useLibraryManagement()

	const handleSubmit = useCallback(
		(params: PatchParams) => {
			patch({
				// @ts-expect-error: This is fine
				config: {
					...library.config,
					...params,
				},
				scanAfterPersist: false,
			})
		},
		[patch, library.config],
	)

	const schema = useMemo(
		() =>
			buildSchema([], library).pick({
				defaultReadingDir: true,
				defaultReadingImageScaleFit: true,
				defaultReadingMode: true,
			}),
		[library],
	)

	const form = useForm<PatchParams>({
		defaultValues: formDefaults(library),
		resolver: zodResolver(schema),
	})

	const formValues = form.watch([
		'defaultReadingDir',
		'defaultReadingImageScaleFit',
		'defaultReadingMode',
	])
	const didChange = useMemo(() => {
		const config = library.config
		const [dir, scale, mode] = formValues
		return (
			config.defaultReadingDir !== dir ||
			config.defaultReadingImageScaleFit !== scale ||
			config.defaultReadingMode !== mode
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
