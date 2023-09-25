import { zodResolver } from '@hookform/resolvers/zod'
import { useJobSchedulerConfig, useLibraries } from '@stump/client'
import { Alert, Button, ComboBox, Form, Input, Label, NativeSelect } from '@stump/components'
import { Construction } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useMediaMatch } from 'rooks'
import z from 'zod'

const schema = z.object({
	excluded_library_ids: z.array(z.string()).optional(),
	interval_secs: z
		.number()
		.positive()
		.int()
		.min(300, 'You cannot set an interval less than five minutes')
		.optional(),
})
type FormValues = z.infer<typeof schema>

const INTERVAL_PRESETS = [
	{ label: 'Every 6 hours', value: 21600 },
	{ label: 'Every 12 hours', value: 43200 },
	{ label: 'Once a day', value: 86400 },
	{ label: 'Once a week', value: 604800 },
	{ label: 'Once a month', value: 2592000 },
]

const getCorrespondingPreset = (seconds: number) =>
	INTERVAL_PRESETS.find((preset) => preset.value === seconds)

export default function JobScheduler() {
	const { libraries } = useLibraries()
	const { config, update } = useJobSchedulerConfig()

	const isSmallViewport = useMediaMatch('(max-width: 768px)')
	const [intervalPreset, setIntervalPreset] = useState(-1)

	const form = useForm({
		defaultValues: {
			excluded_library_ids: config?.excluded_libraries.map((library) => library.id),
			interval_secs: config?.interval_secs,
		},
		resolver: zodResolver(schema),
	})

	const [excluded_library_ids, interval_secs] = form.watch([
		'excluded_library_ids',
		'interval_secs',
	])

	const handleSubmit = async (values: FormValues) => {
		update(values, {
			onError: (error) => {
				console.error(error)
				toast.error('Failed to update job scheduler config')
			},
			onSuccess: () => {
				toast.success('Scheduler config updated!')
			},
		})
	}

	const handleIntervalPresetChange = (value?: string) => {
		if (!value) {
			setIntervalPreset(-1)
			return
		}

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

	useEffect(() => {
		// if not preset matches the current interval, set it to custom
		const preset = INTERVAL_PRESETS.find((preset) => preset.value === interval_secs)
		setIntervalPreset(preset?.value ?? -1)
	}, [interval_secs])

	useEffect(() => {
		if (config) {
			setIntervalPreset(getCorrespondingPreset(config.interval_secs)?.value ?? -1)
			form.setValue(
				'excluded_library_ids',
				config.excluded_libraries.map(({ id }) => id),
			)
		}
	}, [form, config])

	return (
		<div className="my-2 flex flex-col gap-6">
			<Alert level="warning" rounded="sm" icon={Construction}>
				<Alert.Content>
					Stump currently only supports scheduling scanner jobs. This will be extended to support
					other job types in the future.
				</Alert.Content>
			</Alert>

			<Form form={form} onSubmit={handleSubmit}>
				<div className="flex w-full flex-col gap-2 md:flex-row md:items-end lg:w-1/2">
					<Input
						variant="primary"
						type="number"
						label="Interval"
						description="How often the scheduler should initiate scans (in seconds)"
						descriptionPosition="top"
						placeholder='e.g. "86400" for once a day'
						fullWidth
						{...form.register('interval_secs', {
							valueAsNumber: true,
						})}
					/>

					<div className="flex-shrink-0">
						<Label htmlFor="intervalPreset">Interval preset</Label>
						<NativeSelect
							value={intervalPreset}
							options={INTERVAL_PRESETS}
							onChange={(e) => handleIntervalPresetChange(e.target.value)}
							emptyOption={{ label: 'Custom', value: -1 }}
						/>
					</div>
				</div>

				<div className="flex w-full flex-col gap-4 md:flex-row md:items-end md:justify-between lg:w-1/2">
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
						size={isSmallViewport ? 'full' : 'default'}
					/>

					<Button
						type="submit"
						variant="primary"
						size="md"
						disabled={form.formState.isSubmitting}
						className="flex-shrink-0"
					>
						Save changes
					</Button>
				</div>
			</Form>
		</div>
	)
}
