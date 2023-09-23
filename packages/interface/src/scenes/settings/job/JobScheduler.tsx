import { zodResolver } from '@hookform/resolvers/zod'
import { useJobSchedulerConfig, useLibraries } from '@stump/client'
import { Alert, ComboBox, Form, Input, Label, NativeSelect } from '@stump/components'
import { Construction } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import z from 'zod'

const schema = z.object({
	excluded_library_ids: z.array(z.string()).optional(),
	interval_secs: z.number().positive().int().optional(),
})
type FormValues = z.infer<typeof schema>

const INTERVAL_PRESETS = [
	{ label: 'Custom', value: -1 },
	{ label: 'Once a day', value: 86400 },
	{ label: 'Every 12 hours', value: 43200 },
	{ label: 'Once a week', value: 604800 },
	{ label: 'Once a month', value: 2592000 },
]

export default function JobScheduler() {
	const { libraries } = useLibraries()
	const { config, update } = useJobSchedulerConfig()

	const [intervalPreset, setIntervalPreset] = useState<number>()

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

	const handleIntervalPresetChange = (value: string) => {
		const parsed = parseInt(value, 10)
		if (!isNaN(parsed)) {
			setIntervalPreset(parsed)
		}
	}

	useEffect(() => {
		if (intervalPreset !== undefined && intervalPreset !== -1) {
			form.setValue('interval_secs', intervalPreset)
		}
	}, [form, intervalPreset])

	return (
		<div className="-mt-4 flex flex-col gap-6">
			<Alert level="warning" rounded="sm" icon={Construction}>
				<Alert.Content>
					Stump currently only supports scheduling scanner jobs. This will be extended to support
					other job types in the future.
				</Alert.Content>
			</Alert>

			<Form form={form} onSubmit={handleSubmit}>
				<div className="flex w-full items-end gap-2">
					<Input
						type="number"
						label="Interval"
						description="How often the scheduler should initiate scans (in seconds)"
						descriptionPosition="top"
						placeholder='e.g. "86400" for once a day'
						{...form.register('interval_secs')}
					/>

					<div>
						{/* TODO: this doesn't work as expected, update UX */}
						<Label htmlFor="intervalPreset">Interval preset</Label>
						<NativeSelect
							value={intervalPreset ?? -1}
							options={INTERVAL_PRESETS}
							onChange={(e) => handleIntervalPresetChange(e.target.value)}
						/>
					</div>
				</div>

				<ComboBox
					label="Excluded libraries"
					description="Libraries that will be excluded from the scheduled scans"
					descriptionPosition="top"
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
