import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@stump/components'
import { useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'

import {
	buildSchema,
	CreateOrUpdateLibrarySchema,
	formDefaults,
	IgnoreRulesConfig,
} from '@/components/library/createOrUpdate'

import { useLibraryManagement } from '../context'

export default function IgnoreRulesPatchForm() {
	const { library, patch } = useLibraryManagement()

	const schema = useMemo(() => buildSchema([], library), [library])
	const form = useForm<CreateOrUpdateLibrarySchema>({
		defaultValues: formDefaults(library),
		reValidateMode: 'onChange',
		resolver: zodResolver(schema),
	})

	const handleSubmit = useCallback(
		({ ignore_rules }: CreateOrUpdateLibrarySchema) => {
			patch({
				config: {
					...library.config,
					ignore_rules: ignore_rules?.map(({ glob }) => glob),
				},
				scan_mode: 'NONE',
			})
		},
		[patch, library],
	)

	return (
		<Form form={form} onSubmit={handleSubmit}>
			<IgnoreRulesConfig />
		</Form>
	)
}
