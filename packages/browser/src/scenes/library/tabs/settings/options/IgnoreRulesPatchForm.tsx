import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@stump/components'
import React, { useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'

import {
	buildScema,
	CreateOrUpdateLibrarySchema,
	formDefaults,
	IgnoreRulesConfig,
	LibraryPattern,
} from '@/components/library/createOrUpdate'

import { useLibraryManagement } from '../context'

export default function IgnoreRulesPatchForm() {
	const { library, patch } = useLibraryManagement()

	const schema = useMemo(() => buildScema([], library), [library])
	const form = useForm<CreateOrUpdateLibrarySchema>({
		defaultValues: formDefaults(library),
		reValidateMode: 'onChange',
		resolver: zodResolver(schema),
	})

	const handleSubmit = useCallback(
		(values: CreateOrUpdateLibrarySchema) => {
			patch({
				library_options: {
					...library.library_options,
					ignore_rules: values.ignore_rules?.map(({ glob }) => glob),
				},
				scan_mode: 'NONE',
			})
		},
		[patch, library],
	)

	return (
		<Form form={form} onSubmit={handleSubmit} fieldsetClassName="space-y-12">
			{/* Note: This component doesn't really belong here, but I didn't want to wrap it in its own form when it is just for display */}
			{/* Should probably create a separate, non-formy variant */}
			<LibraryPattern />
			<IgnoreRulesConfig />
		</Form>
	)
}
