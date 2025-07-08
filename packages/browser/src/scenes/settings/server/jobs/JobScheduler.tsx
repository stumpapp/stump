import { zodResolver } from '@hookform/resolvers/zod'
import { useGraphQLMutation, useSDK, useSuspenseGraphQL } from '@stump/client'
import { Alert, Button, ComboBox, Form, Input, Label, NativeSelect } from '@stump/components'
import { graphql } from '@stump/graphql'
import { Construction } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useMediaMatch } from 'rooks'
import z from 'zod'

const query = graphql(`
	query JobSchedulerConfig {
		libraries(pagination: { none: { unpaginated: true } }) {
			nodes {
				id
				name
				emoji
			}
		}
		scheduledJobConfigs {
			id
			intervalSecs
			# Note: For now scanConfigs are actually just a library node
			scanConfigs {
				id
				name
			}
		}
	}
`)

const mutation = graphql(`
	mutation JobSchedulerUpdate($input: ScheduledJobConfigInput!) {
		updateScheduledJobConfig(input: $input) {
			id
			intervalSecs
			scanConfigs {
				id
				name
			}
		}
	}
`)

export default function JobScheduler() {
	const { sdk } = useSDK()

	const {
		data: {
			libraries: { nodes: libraries },
			scheduledJobConfigs: [config],
		},
	} = useSuspenseGraphQL(query, sdk.cacheKey('scheduler'))

	const isSmallViewport = useMediaMatch('(max-width: 768px)')

	const [intervalPreset, setIntervalPreset] = useState(
		getCorrespondingPreset(config?.intervalSecs || -1)?.value ?? -1,
	)

	const { mutate } = useGraphQLMutation(mutation, {
		onError: (error) => {
			console.error(error)
			toast.error('Failed to update job scheduler config')
		},
		onSuccess: () => {
			toast.success('Scheduler config updated!')
		},
	})

	const form = useForm({
		defaultValues: {
			includedLibraryIds: config?.scanConfigs.map((library) => library.id) || [],
			intervalSecs: config?.intervalSecs,
		},
		resolver: zodResolver(schema),
	})

	const [includedLibraryIds, intervalSecs] = form.watch(['includedLibraryIds', 'intervalSecs'])

	const handleSubmit = useCallback(
		({ intervalSecs, includedLibraryIds }: FormValues) => {
			mutate({
				input: {
					includedLibraries: includedLibraryIds,
					intervalSecs: intervalSecs ?? config?.intervalSecs ?? 86400,
				},
			})
		},
		[mutate, config],
	)

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
			form.setValue('intervalSecs', intervalPreset)
		}
	}, [form, intervalPreset])

	useEffect(() => {
		// if not preset matches the current interval, set it to custom
		const preset = INTERVAL_PRESETS.find((preset) => preset.value === intervalSecs)
		setIntervalPreset(preset?.value ?? -1)
	}, [intervalSecs])

	useEffect(() => {
		if (config) {
			setIntervalPreset(getCorrespondingPreset(config.intervalSecs)?.value ?? -1)
			form.setValue(
				'includedLibraryIds',
				config.scanConfigs.map(({ id }) => id),
			)
			form.setValue('intervalSecs', config.intervalSecs)
		}
	}, [form, config])

	return (
		<div className="my-2 flex flex-col gap-6">
			<Alert level="warning" icon={Construction}>
				<Alert.Content>
					Stump currently only supports scheduling scanner jobs. This will be extended to support
					other job types in the future.
				</Alert.Content>
			</Alert>

			<Form form={form} onSubmit={handleSubmit}>
				<div className="flex w-full flex-col gap-2 md:flex-row md:items-end lg:w-2/3">
					<Input
						variant="primary"
						type="number"
						label="Interval"
						description="How often the scheduler should initiate scans (in seconds). If left empty, the scheduler will be disabled"
						descriptionPosition="top"
						placeholder='e.g. "86400" for once a day'
						fullWidth
						{...form.register('intervalSecs', {
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

				<div className="flex w-full flex-col gap-4 md:flex-row md:items-end md:justify-between lg:w-2/3">
					<ComboBox
						label="Excluded libraries"
						description="Libraries that will be excluded from the scheduled scans"
						descriptionPosition="top"
						isMultiSelect
						value={includedLibraryIds}
						options={(libraries || []).map((library) => ({
							label: library.name,
							value: library.id,
						}))}
						onChange={(value) => (value ? form.setValue('includedLibraryIds', value) : null)}
						size={isSmallViewport ? 'full' : 'default'}
					/>
				</div>

				<Button
					type="submit"
					variant="primary"
					size="md"
					disabled={form.formState.isSubmitting}
					className="flex-shrink-0 md:w-32"
				>
					Save changes
				</Button>
			</Form>
		</div>
	)
}

const schema = z.object({
	includedLibraryIds: z.array(z.string()).default([]),
	intervalSecs: z
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
