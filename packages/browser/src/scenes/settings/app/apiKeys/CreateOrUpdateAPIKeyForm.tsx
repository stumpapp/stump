import { useCallback } from 'react'
import { z } from 'zod'
import { allPermissions, userPermissionSchema } from '../../server/users/create-or-update/schema'
import { useForm, useFormState } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, ComboBox, DatePicker, Form, Input, RadioGroup } from '@stump/components'
import dayjs from 'dayjs'

export const CREATE_OR_UPDATE_API_KEY_FORM_ID = 'create-or-update-api-key-form'

type Props = {
	onSubmit: (values: CreateOrUpdateAPIKeyFormValues) => void
}

// TODO(koreader): localize
export default function CreateOrUpdateAPIKeyForm({ onSubmit }: Props) {
	const form = useForm<CreateOrUpdateAPIKeyFormValues>({
		defaultValues: {
			name: '',
			inherit: true,
			explicit_permissions: [],
		} satisfies CreateOrUpdateAPIKeyFormValues,
		resolver: zodResolver(schema),
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
					label="Inherit permissions"
					description="The same permissions as your account"
					isActive={inherit}
				>
					{inherit && (
						<div className="pl-4">
							<Alert level="warning">
								<Alert.Content>
									This API key will inherit your full permissions, which means it can do anything
									you can do. Be careful with this setting
								</Alert.Content>
							</Alert>
						</div>
					)}
				</RadioGroup.CardItem>

				<RadioGroup.CardItem
					value="explicit"
					label="Explicit permissions"
					description="Choose the permissions this key should have"
					isActive={!inherit}
				>
					{!inherit && (
						<div className="pl-4">
							<ComboBox
								// TODO: localize
								options={allPermissions.map((permission) => ({
									value: permission,
									label: permission,
								}))}
								value={permissions}
								// TODO: typecheck values
								onChange={(value) => form.setValue('explicit_permissions', value || [])}
								isMultiSelect
								disabled={inherit}
							/>
						</div>
					)}
				</RadioGroup.CardItem>
			</RadioGroup>

			<DatePicker
				label="Expires at"
				placeholder="Never"
				selected={expiresAt}
				onChange={handleDateChange}
				minDate={dayjs().add(1, 'day').endOf('day').toDate()}
			/>
		</Form>
	)
}

const schema = z.object({
	name: z.string().min(1),
	// permissions: z.union([z.literal('inherit'), z.array(userPermissionSchema)]),
	inherit: z.boolean(),
	explicit_permissions: z.array(userPermissionSchema),
	expires_at: z
		.date()
		.optional()
		.refine((value) => value == undefined || value > new Date(), {
			message: 'Expiration date must be in the future',
		}),
})

export type CreateOrUpdateAPIKeyFormValues = z.infer<typeof schema>
