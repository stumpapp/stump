import { zodResolver } from '@hookform/resolvers/zod'
import { useGraphQLMutation } from '@stump/client'
import {
	Button,
	CheckBox,
	ComboBox,
	Dialog,
	Form,
	Input,
	Label,
	NativeSelect,
} from '@stump/components'
import { FragmentType, graphql, MetadataFetchStatus, useFragment } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useEffect, useMemo, useState } from 'react'
import { useForm, useFormState, useWatch } from 'react-hook-form'
import { toast } from 'sonner'

import { scheduledJobRowFragment } from './ScheduledJobRow'
import {
	buildScheduledJobInput,
	CRON_PRESETS,
	KIND_OPTIONS,
	LibraryOption,
	parseScheduledJobConfig,
	RETRYABLE_STATUSES,
	scheduledJobFormSchema,
	ScheduledJobFormValues,
} from './utils'

const createMutation = graphql(`
	mutation CreateScheduledJob($input: CreateScheduledJobInput!) {
		createScheduledJob(input: $input) {
			...ScheduledJobRow
		}
	}
`)

const updateMutation = graphql(`
	mutation UpdateScheduledJob($id: Int!, $input: UpdateScheduledJobInput!) {
		updateScheduledJob(id: $id, input: $input) {
			...ScheduledJobRow
		}
	}
`)

type Props = {
	isOpen: boolean
	editing: FragmentType<typeof scheduledJobRowFragment> | null
	libraries: LibraryOption[]
	onClose: () => void
	onSuccess: () => void
}

export function CreateOrEditScheduledJobDialog({
	isOpen,
	editing,
	libraries,
	onClose,
	onSuccess,
}: Props) {
	const { t } = useLocaleContext()
	const data = useFragment(scheduledJobRowFragment, editing)
	const isEditing = data != null

	const defaultValues = useMemo(() => {
		if (data) {
			const config = parseScheduledJobConfig(data.config)
			return {
				name: data.name,
				schedule: data.schedule,
				kind: data.kind as ScheduledJobFormValues['kind'],
				libraryIds: config && 'libraryIds' in config ? config.libraryIds : [],
				statuses:
					config && 'statuses' in config ? config.statuses : [MetadataFetchStatus.RateLimited],
				enabled: data.enabled,
			} satisfies ScheduledJobFormValues
		}
		return {
			name: '',
			schedule: '0 0 0 * * *',
			kind: 'LIBRARY_SCAN',
			libraryIds: [],
			statuses: [MetadataFetchStatus.RateLimited],
			enabled: true,
		} satisfies ScheduledJobFormValues
	}, [data])

	const form = useForm<ScheduledJobFormValues>({
		defaultValues,
		resolver: zodResolver(scheduledJobFormSchema),
	})

	const [watchKind, schedule, libraryIds, statuses, enabled] = useWatch({
		control: form.control,
		name: ['kind', 'schedule', 'libraryIds', 'statuses', 'enabled'],
	})
	const [cronPreset, setCronPreset] = useState('')
	const { errors: formErrors } = useFormState({ control: form.control })

	useEffect(() => {
		if (isOpen) {
			form.reset(defaultValues)
		}
	}, [isOpen, defaultValues, form])

	// Sync the preset based on the cron value
	useEffect(() => {
		const match = CRON_PRESETS.find((p) => p.value === schedule)
		setCronPreset(match?.value ?? '')
	}, [schedule])

	const { mutate: create, isPending: isCreating } = useGraphQLMutation(createMutation, {
		onError: (error) => {
			console.error(error)
			toast.error(t(getKey('toasts.createError')))
		},
		onSuccess: () => {
			toast.success(t(getKey('toasts.createSuccess')))
			onClose()
			onSuccess()
		},
	})

	const { mutate: update, isPending: isUpdating } = useGraphQLMutation(updateMutation, {
		onError: (error) => {
			console.error(error)
			toast.error(t(getKey('toasts.updateError')))
		},
		onSuccess: () => {
			toast.success(t(getKey('toasts.updateSuccess')))
			onClose()
			onSuccess()
		},
	})

	const isBusy = isCreating || isUpdating

	const handleSubmit = (values: ScheduledJobFormValues) => {
		const input = buildScheduledJobInput(values)
		if (isEditing && data) {
			update({ id: data.id, input })
		} else {
			create({ input })
		}
	}

	const handlePresetChange = (value?: string) => {
		if (value) {
			setCronPreset(value)
			form.setValue('schedule', value, { shouldValidate: true })
		} else {
			setCronPreset('')
		}
	}

	const formId = isEditing ? 'edit-scheduled-job' : 'create-scheduled-job'

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<Dialog.Content size="md">
				<Dialog.Header>
					<Dialog.Title>
						{t(getKey(`dialog.${isEditing ? 'titleEdit' : 'titleCreate'}`))}
					</Dialog.Title>
					<Dialog.Close onClick={onClose} />
				</Dialog.Header>

				<Form id={formId} form={form} onSubmit={handleSubmit}>
					<div className="gap-4 flex flex-col">
						<Input
							label={t(getKey('fields.name.label'))}
							placeholder={t(getKey('fields.name.placeholder'))}
							errorMessage={formErrors.name?.message}
							{...form.register('name')}
						/>

						<div className="gap-2 md:flex-row md:items-end flex flex-col">
							<Input
								label={t(getKey('fields.schedule.label'))}
								description={t(getKey('fields.schedule.description'))}
								descriptionPosition="top"
								placeholder={t(getKey('fields.schedule.placeholder'))}
								className="font-mono"
								errorMessage={formErrors.schedule?.message}
								{...form.register('schedule')}
							/>
							<div className="flex-shrink-0">
								<NativeSelect
									value={cronPreset}
									options={CRON_PRESETS.map((p) => ({
										label: t(getKey(`fields.schedulePreset.${p.localeKey}`)),
										value: p.value,
									}))}
									onChange={(e) => handlePresetChange(e.target.value)}
									emptyOption={{
										label: t(getKey('fields.schedulePreset.custom')),
										value: '',
									}}
								/>
							</div>
						</div>

						{!isEditing && (
							<div className="gap-1.5 flex flex-col">
								<Label>{t(getKey('fields.kind.label'))}</Label>
								<NativeSelect
									value={watchKind}
									options={KIND_OPTIONS.map((o) => ({
										label: t(getKey(`fields.kind.${o.localeKey}`)),
										value: o.value,
									}))}
									onChange={(e) =>
										form.setValue('kind', e.target.value as ScheduledJobFormValues['kind'], {
											shouldValidate: true,
										})
									}
								/>
							</div>
						)}

						{watchKind === 'LIBRARY_SCAN' && (
							<ComboBox
								label={t(getKey('fields.libraryIds.label'))}
								description={t(getKey('fields.libraryIds.description'))}
								descriptionPosition="top"
								isMultiSelect
								value={libraryIds}
								options={libraries.map((lib) => ({ label: lib.name, value: lib.id }))}
								onChange={(value) => form.setValue('libraryIds', value ?? [])}
							/>
						)}

						{watchKind === 'METADATA_RETRY' && (
							<ComboBox
								label={t(getKey('fields.statuses.label'))}
								description={t(getKey('fields.statuses.description'))}
								descriptionPosition="top"
								isMultiSelect
								value={statuses}
								options={RETRYABLE_STATUSES.map((s) => ({
									label: t(getKey(`fields.statuses.${s.localeKey}`)),
									value: s.value,
								}))}
								onChange={(value) =>
									form.setValue(
										'statuses',
										(value ?? [MetadataFetchStatus.RateLimited]) as MetadataFetchStatus[],
									)
								}
							/>
						)}

						<CheckBox
							label={t(getKey('fields.enabled'))}
							checked={enabled}
							onClick={() => form.setValue('enabled', !enabled)}
						/>
					</div>
				</Form>

				<Dialog.Footer>
					<Button variant="outline" onClick={onClose} disabled={isBusy}>
						{t(getKey('dialog.cancel'))}
					</Button>
					<Button type="submit" form={formId} disabled={isBusy}>
						{t(getKey(`dialog.${isEditing ? 'saveChanges' : 'create'}`))}
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog>
	)
}

const LOCALE_BASE = 'settingsScene.server/jobs.sections.scheduling'

const getKey = (key: string) => `${LOCALE_BASE}.${key}`
