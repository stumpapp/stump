import { zodResolver } from '@hookform/resolvers/zod'
import {
	Alert,
	AlertDescription,
	ComboBox,
	DatePicker,
	Form,
	Input,
	RadioGroup,
} from '@stump/components'
import { Apikey } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { allPermissions, isUserPermission } from '@stump/sdk'
import dayjs from 'dayjs'
import { useCallback } from 'react'
import { useForm, useFormState } from 'react-hook-form'
import { z } from 'zod'

import { useAppContext } from '@/context'

import { userPermissionSchema } from '../../server/users/create-or-update/schema'

export const CREATE_OR_UPDATE_API_KEY_FORM_ID = 'create-or-update-api-key-form'

type Props = {
	editingKey?: Apikey
	onSubmit: (values: CreateOrUpdateAPIKeyFormValues) => void
	onFormFocusStateChanged?: (focused: boolean) => void
}

const toFormPermissions = (key: Apikey) => {
	if (key.permissions.__typename === 'InheritPermissionStruct') {
		return { inherit: true, explicitPermissions: [] }
	} else if (key.permissions.__typename === 'UserPermissionStruct') {
		return {
			inherit: false,
			explicitPermissions: key.permissions.value,
		}
	}

	return { inherit: false, explicitPermissions: [] }
}

const formDefaults = (key?: Apikey) =>
	({
		name: key?.name || '',
		...(key ? toFormPermissions(key) : { inherit: false, explicitPermissions: [] }),
		expiresAt: key?.expiresAt ? new Date(key.expiresAt) : undefined,
	}) satisfies CreateOrUpdateAPIKeyFormValues

// FIXME: The combobox transforms the values to lowercase, which makes things fucking annoying.
// We need to either fix the combobox or handle the transformation ourselves.

export default function CreateOrUpdateAPIKeyForm({
	onSubmit,
	editingKey,
	onFormFocusStateChanged,
}: Props) {
	const { t } = useLocaleContext()
	const { checkPermission } = useAppContext()

	const form = useForm<CreateOrUpdateAPIKeyFormValues>({
		defaultValues: formDefaults(editingKey),
		resolver: zodResolver(createSchema(t)),
	})
	const { errors } = useFormState({ control: form.control })

	const [inherit, permissions, expiresAt] = form.watch([
		'inherit',
		'explicitPermissions',
		'expiresAt',
	])

	const handleDateChange = useCallback(
		(date?: Date) => {
			if (date) {
				const adjusted = dayjs(date).endOf('day').toDate()
				form.setValue('expiresAt', adjusted)
			} else {
				form.setValue('expiresAt', undefined)
			}
		},
		[form],
	)

	const handlePermissionsChange = useCallback(
		(value?: string[]) => {
			const adjustedValue = new Set(value?.map((v) => v.toUpperCase()))
			form.setValue('explicitPermissions', Array.from(adjustedValue).filter(isUserPermission))
		},
		[form],
	)

	const validPermissions = allPermissions.filter(checkPermission)

	return (
		<Form
			form={form}
			onSubmit={onSubmit}
			id={CREATE_OR_UPDATE_API_KEY_FORM_ID}
			onFocus={() => {
				onFormFocusStateChanged?.(true)
			}}
			onBlur={() => {
				onFormFocusStateChanged?.(false)
			}}
		>
			<Input
				label="Name"
				placeholder="Koreader Sync"
				{...form.register('name')}
				errorMessage={errors.name?.message}
				ignoreFill
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
							<Alert variant="warning">
								<AlertDescription>{t(getKey('inheritDisclaimer'))}</AlertDescription>
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
								options={validPermissions.map((permission) => ({
									value: permission,
									label: t(`userPermissions.${permission}.label`),
								}))}
								value={permissions}
								onChange={handlePermissionsChange}
								isMultiSelect
								disabled={inherit}
							/>
						</div>
					)}
				</RadioGroup.CardItem>
			</RadioGroup>

			<DatePicker
				label={t(getFieldKey('expiresAt.label'))}
				placeholder={t(getFieldKey('expiresAt.placeholder'))}
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
		explicitPermissions: z.array(userPermissionSchema),
		expiresAt: z
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
