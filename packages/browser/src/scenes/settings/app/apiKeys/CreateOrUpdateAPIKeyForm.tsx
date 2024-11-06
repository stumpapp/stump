import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, ComboBox, DatePicker, Form, Input, RadioGroup } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { allPermissions, APIKey, isUserPermission } from '@stump/sdk'
import dayjs from 'dayjs'
import { useCallback } from 'react'
import { useForm, useFormState } from 'react-hook-form'
import { z } from 'zod'

import { useAppContext } from '@/context'

import { userPermissionSchema } from '../../server/users/create-or-update/schema'

export const CREATE_OR_UPDATE_API_KEY_FORM_ID = 'create-or-update-api-key-form'

type Props = {
	editingKey?: APIKey
	onSubmit: (values: CreateOrUpdateAPIKeyFormValues) => void
}

const formDefaults = (key?: APIKey) =>
	({
		name: key?.name || '',
		inherit: key?.permissions === 'inherit',
		explicit_permissions: key?.permissions === 'inherit' ? [] : key?.permissions || [],
		expires_at: key?.expires_at ? new Date(key.expires_at) : undefined,
	}) satisfies CreateOrUpdateAPIKeyFormValues

export default function CreateOrUpdateAPIKeyForm({ onSubmit, editingKey }: Props) {
	const { t } = useLocaleContext()
	const { checkPermission } = useAppContext()

	const form = useForm<CreateOrUpdateAPIKeyFormValues>({
		defaultValues: formDefaults(editingKey),
		resolver: zodResolver(createSchema(t)),
	})
	const { errors } = useFormState({ control: form.control })

	const [inherit, permissions, expiresAt] = form.watch([
		'inherit',
		'explicit_permissions',
		'expires_at',
	])

	const handleDateChange = useCallback(
		(date?: Date) => {
			if (date) {
				const adjusted = dayjs(date).endOf('day').toDate()
				form.setValue('expires_at', adjusted)
			} else {
				form.setValue('expires_at', undefined)
			}
		},
		[form],
	)

	const validPermissions = allPermissions.filter(checkPermission)

	return (
		<Form form={form} onSubmit={onSubmit} id={CREATE_OR_UPDATE_API_KEY_FORM_ID}>
			<Input
				label="Name"
				placeholder="Koreader Sync"
				{...form.register('name')}
				errorMessage={errors.name?.message}
			/>

			<RadioGroup
				value={inherit ? 'inherit' : 'explicit'}
				onValueChange={(value) => form.setValue('inherit', value === 'inherit')}
			>
				<RadioGroup.CardItem
					value="inherit"
					label={t(getFieldKey('permissions.inherit.label'))}
					description={t(getFieldKey('permissions.inherit.description'))}
					isActive={inherit}
				>
					{inherit && (
						<div className="pl-4">
							<Alert level="warning">
								<Alert.Content>{t(getKey('inheritDisclaimer'))}</Alert.Content>
							</Alert>
						</div>
					)}
				</RadioGroup.CardItem>

				<RadioGroup.CardItem
					value="explicit"
					label={t(getFieldKey('permissions.explicit.label'))}
					description={t(getFieldKey('permissions.explicit.description'))}
					isActive={!inherit}
				>
					{!inherit && (
						<div className="pl-4">
							<ComboBox
								// TODO: localize
								options={validPermissions.map((permission) => ({
									value: permission,
									label: permission,
								}))}
								value={permissions}
								// TODO: typecheck values
								onChange={(value) =>
									form.setValue('explicit_permissions', value?.filter(isUserPermission) || [])
								}
								isMultiSelect
								disabled={inherit}
							/>
						</div>
					)}
				</RadioGroup.CardItem>
			</RadioGroup>

			<DatePicker
				label={t(getFieldKey('expires_at.label'))}
				placeholder={t(getFieldKey('expires_at.placeholder'))}
				selected={expiresAt}
				onChange={handleDateChange}
				minDate={dayjs().add(1, 'day').endOf('day').toDate()}
			/>
		</Form>
	)
}

export const createSchema = (t: (key: string) => string) =>
	z.object({
		name: z.string().min(1),
		inherit: z.boolean(),
		explicit_permissions: z.array(userPermissionSchema),
		expires_at: z
			.date()
			.optional()
			.refine((value) => value == undefined || value > new Date(), {
				message: t(getKey('validation.futureDate')),
			}),
	})

export type CreateOrUpdateAPIKeyFormValues = z.infer<ReturnType<typeof createSchema>>

const LOCALE_BASE = 'createOrUpdateApiKey'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
const getFieldKey = (key: string) => `${LOCALE_BASE}.fields.${key}`
