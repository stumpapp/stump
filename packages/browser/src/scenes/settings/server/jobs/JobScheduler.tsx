import { zodResolver } from '@hookform/resolvers/zod'
import { useGraphQLMutation, useSDK, useSuspenseGraphQL } from '@stump/client'
import {
	Alert,
	AlertDescription,
	Button,
	ComboBox,
	Form,
	Input,
	Label,
	NativeSelect,
} from '@stump/components'
import { graphql, JobSchedulerConfigQuery } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { Api } from '@stump/sdk'
import { QueryClient, useQueryClient } from '@tanstack/react-query'
import { Construction } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm, useFormState } from 'react-hook-form'
import { useMediaMatch } from 'rooks'
import { toast } from 'sonner'
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

export const prefetchScheduler = (client: QueryClient, sdk: Api) => {
	client.prefetchQuery({
		queryKey: sdk.cacheKey('scheduler'),
		queryFn: async () => {
			const response = await sdk.execute(query)
			return response
		},
	})
}

const updateMutation = graphql(`
	mutation JobSchedulerUpdate($id: Int!, $input: ScheduledJobConfigInput!) {
		updateScheduledJobConfig(id: $id, input: $input) {
			id
			intervalSecs
			scanConfigs {
				id
				name
			}
		}
	}
`)

const deleteMutation = graphql(`
	mutation JobSchedulerDelete($id: Int!) {
		deleteScheduledJobConfig(id: $id)
	}
`)

const createMutation = graphql(`
	mutation JobSchedulerCreate($input: ScheduledJobConfigInput!) {
		createScheduledJobConfig(input: $input) {
			id
			intervalSecs
			scanConfigs {
				id
				name
			}
		}
	}
`)

// TODO: Completely redo this feature to be more robust! I want something like:
// - Multiple scheduled jobs of varying types
// - An explicit create vs edit flow in the UI (right now it is derived)

export default function JobScheduler() {
	const { t } = useLocaleContext()
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
	const client = useQueryClient()

	const { mutate: create } = useGraphQLMutation(createMutation, {
		onError: (error) => {
			console.error(error)
			toast.error('Failed to create job scheduler config')
		},
		onSuccess: ({ createScheduledJobConfig: createdConfig }) => {
			client.setQueryData(sdk.cacheKey('scheduler'), (data?: JobSchedulerConfigQuery) => {
				if (!data) return data
				return {
					...data,
					scheduledJobConfigs: [...data.scheduledJobConfigs, createdConfig],
				}
			})
		},
	})

	const { mutate: update } = useGraphQLMutation(updateMutation, {
		onError: (error) => {
			console.error(error)
			toast.error('Failed to update job scheduler config')
		},
		onSuccess: () => {
			client.setQueryData(sdk.cacheKey('scheduler'), (data?: JobSchedulerConfigQuery) => {
				if (!data) return data

				const adjustedConfigs = data.scheduledJobConfigs.map((c) => {
					if (c.id === config?.id) {
						return {
							...c,
							intervalSecs,
							scanConfigs: libraries.filter((lib) => includedLibraryIds.includes(lib.id)),
						}
					}
					return c
				})

				return {
					...data,
					scheduledJobConfigs: adjustedConfigs,
				}
			})
		},
	})

	const { mutate: deleteConfig } = useGraphQLMutation(deleteMutation, {
		onError: (error) => {
			console.error(error)
			toast.error('Failed to delete job scheduler config')
		},
		onSuccess: () => {
			client.setQueryData(sdk.cacheKey('scheduler'), (data?: JobSchedulerConfigQuery) => {
				if (!data) return data
				return {
					...data,
					scheduledJobConfigs: data.scheduledJobConfigs.filter((c) => c.id !== config?.id),
				}
			})
		},
	})

	const form = useForm({
		defaultValues: {
			includedLibraryIds: config?.scanConfigs.map((library) => library.id) || [],
			intervalSecs: config?.intervalSecs,
		},
		resolver: zodResolver(schema),
	})
	const { isSubmitting } = useFormState({ control: form.control })

	const [includedLibraryIds, intervalSecs] = form.watch(['includedLibraryIds', 'intervalSecs'])

	const isConfigDifferent = useMemo(() => {
		if (!config) return true
		return (
			config.intervalSecs !== intervalSecs ||
			config.scanConfigs
				.map((lib) => lib.id)
				.sort()
				.join(',') !== includedLibraryIds.sort().join(',')
		)
	}, [config, includedLibraryIds, intervalSecs])

	const handleSubmit = useCallback(
		({ intervalSecs, includedLibraryIds }: FormValues) => {
			if (!intervalSecs && !config) {
				// Invalid
				return
			}

			if (config && intervalSecs) {
				update({
					id: config.id,
					input: {
						includedLibraryIds,
						intervalSecs: intervalSecs ?? config?.intervalSecs ?? 86400,
					},
				})
			} else if (config) {
				deleteConfig({ id: config.id })
			} else {
				create({
					input: {
						includedLibraryIds,
						intervalSecs: intervalSecs ?? 86400, // Default to 1 day if not set
					},
				})
			}
		},
		[create, update, deleteConfig, config],
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
			<Alert id="futureSchedulerFeatures" variant="info" dismissible>
				<Construction />
				<AlertDescription>
					{t('settingsScene.server/jobs.sections.scheduling.disclaimer')}
				</AlertDescription>
			</Alert>

			<Form form={form} onSubmit={handleSubmit}>
				<div className="flex w-full flex-col gap-2 md:flex-row md:items-end lg:w-2/3">
					<Input
						variant="primary"
						type="number"
						label={t(getFieldKey('intervalSecs', 'label'))}
						description={t(getFieldKey('intervalSecs', 'description'))}
						descriptionPosition="top"
						placeholder={t(getFieldKey('intervalSecs', 'placeholder'))}
						fullWidth
						{...form.register('intervalSecs', {
							valueAsNumber: true,
						})}
					/>

					<div className="flex-shrink-0">
						<Label htmlFor="intervalPreset">Interval preset</Label>
						<NativeSelect
							value={intervalPreset}
							options={INTERVAL_PRESETS.map((option) => ({
								label: t(getFieldKey('intervalPreset.options', option.labelKey)),
								value: option.value,
							}))}
							onChange={(e) => handleIntervalPresetChange(e.target.value)}
							emptyOption={{ label: 'Custom', value: -1 }}
						/>
					</div>
				</div>

				<div className="flex w-full flex-col gap-4 md:flex-row md:items-end md:justify-between lg:w-2/3">
					<ComboBox
						label={t(getFieldKey('includedLibraryIds', 'label'))}
						description={t(getFieldKey('includedLibraryIds', 'description'))}
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
					disabled={!isConfigDifferent || isSubmitting}
					className="flex-shrink-0 md:w-32"
				>
					{t('common.saveChanges')}
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
	{ labelKey: 'everySixHours', value: 21600 },
	{ labelKey: 'everyTwelveHours', value: 43200 },
	{ labelKey: 'oncePerDay', value: 86400 },
	{ labelKey: 'oncePerWeek', value: 604800 },
	{ labelKey: 'oncePerMonth', value: 2592000 },
]

const getCorrespondingPreset = (seconds: number) =>
	INTERVAL_PRESETS.find((preset) => preset.value === seconds)

const LOCALE_BASE = 'settingsScene.server/jobs.sections.scheduling.createOrUpdateConfig'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
const getFieldKey = (field: string, key: string) => getKey(`fields.${field}.${key}`)
