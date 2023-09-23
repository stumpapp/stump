import { zodResolver } from '@hookform/resolvers/zod'
import { useJobSchedulerConfig, useLibraries } from '@stump/client'
import { Alert, ComboBox, Form } from '@stump/components'
import { Construction } from 'lucide-react'
import React from 'react'
import { FieldValues, useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import z from 'zod'

const schema = z.object({
	excluded_library_ids: z.array(z.string()).optional(),
	interval_secs: z.number().positive().int().optional(),
})
type FormValues = z.infer<typeof schema>

export default function JobScheduler() {
	const { libraries } = useLibraries()
	const { config, update } = useJobSchedulerConfig()

	const form = useForm({
		defaultValues: {
			excluded_library_ids: config?.excluded_libraries.map((library) => library.id),
			interval_secs: config?.interval_secs,
		},
		resolver: zodResolver(schema),
	})

	const excluded_library_ids = form.watch('excluded_library_ids')

	const handleSubmit = async (values: FormValues) => {
		update(values, {
			onError: (error) => {
				console.error(error)
				toast.error('Failed to update job scheduler config')
			},
		})
	}

	return (
		<div className="flex flex-col gap-3">
			<Alert level="warning" rounded="sm" className="dark:bg-red-300/25" icon={Construction}>
				<Alert.Content>
					Stump currently only supports scheduling scanner jobs. This will be extended to support
					other job types in the future.
				</Alert.Content>
			</Alert>

			<Form form={form} onSubmit={handleSubmit}>
				<ComboBox
					label="Excluded libraries"
					isMultiSelect
					value={excluded_library_ids}
					options={(libraries || []).map((library) => ({
						label: library.name,
						value: library.id,
					}))}
					onChange={(value) => (value ? form.setValue('excluded_library_ids', value) : null)}
				/>
			</Form>
		</div>
	)
}
