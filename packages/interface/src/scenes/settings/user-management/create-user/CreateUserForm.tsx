import { zodResolver } from '@hookform/resolvers/zod'
import { userQueryKeys } from '@stump/api'
import { invalidateQueries, useCreateUser } from '@stump/client'
import { Alert, Button, Divider, Form, Heading, IconButton, Input, Text } from '@stump/components'
import { User } from '@stump/types'
import { Eye, EyeOff, Shield } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router'
import z from 'zod'

import { useLocaleContext } from '../../../../i18n'
import paths from '../../../../paths'
import { useUserManagementContext } from '../context'
import UserPermissionsForm, { userPermissionSchema } from './UserPermissionsForm'
import UserRestrictionsForm from './UserRestrictionsForm'

const buildSchema = (t: (key: string) => string, existingUsers: User[]) =>
	z.object({
		age_restriction: z
			.number()
			.min(0, { message: t('settingsScene.createUsers.validation.ageRestrictionTooLow') })
			.optional(),
		age_restriction_on_unset: z.boolean().optional(),
		password: z.string().min(1, { message: t('authScene.form.validation.missingPassword') }),
		permissions: z.array(userPermissionSchema).optional(),
		username: z
			.string()
			.min(1, { message: t('authScene.form.validation.missingUsername') })
			.refine(
				(value) => existingUsers.every((user) => user.username !== value),
				(value) => ({ message: `${value} is already taken` }),
			),
	})
export type Schema = z.infer<ReturnType<typeof buildSchema>>

const generateRandomPassword = (length = 16) => {
	const charset =
		'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~}{[]:;?'
	let randomValue = ''
	for (let i = 0, n = charset.length; i < length; ++i) {
		randomValue += charset.charAt(Math.floor(Math.random() * n))
	}
	return randomValue
}

export default function CreateUserForm() {
	const navigate = useNavigate()
	const [passwordVisible, setPasswordVisible] = useState(false)

	const { t } = useLocaleContext()
	const { users } = useUserManagementContext()

	const schema = useMemo(() => buildSchema(t, users), [t, users])
	const form = useForm<Schema>({
		resolver: zodResolver(schema),
	})
	const formHasErrors = useMemo(() => {
		return Object.keys(form.formState.errors).length > 0
	}, [form.formState])

	const { createAsync, error } = useCreateUser()

	const handleSubmit = async ({ username, password, permissions, ...ageRestrictions }: Schema) => {
		try {
			const age_restriction = ageRestrictions.age_restriction
				? {
						age: ageRestrictions.age_restriction,
						restrict_on_unset: ageRestrictions.age_restriction_on_unset ?? false,
				  }
				: null
			const result = await createAsync({ age_restriction, password, permissions, username })
			console.debug('Created user', { result })
			await invalidateQueries({ queryKey: [userQueryKeys.getUsers] })
			toast.success('User created successfully')
			navigate(paths.settings('users'))
		} catch (error) {
			console.error(error)
		}
	}

	return (
		<Form id="create-user-form" form={form} onSubmit={handleSubmit} className="py-2">
			{error && (
				<Alert level="error">
					<Alert.Content>{error.message}</Alert.Content>
				</Alert>
			)}

			<div>
				<Heading size="xs">Account details</Heading>
				<Text size="sm" variant="muted" className="mt-1.5">
					Enter the details for the new user below. They can change these details at any time
				</Text>

				<Divider variant="muted" className="mt-3.5" />
			</div>

			<div className="flex flex-col gap-4 pb-4 pt-1 md:max-w-md">
				<Input
					variant="primary"
					fullWidth
					label="Username"
					placeholder="Username"
					autoComplete="off"
					errorMessage={form.formState.errors.username?.message}
					{...form.register('username')}
				/>
				<Input
					variant="primary"
					fullWidth
					label="Password"
					placeholder="Password"
					errorMessage={form.formState.errors.password?.message}
					type={passwordVisible ? 'text' : 'password'}
					autoComplete="off"
					rightDecoration={
						<IconButton
							type="button"
							variant="ghost"
							size="xs"
							onClick={() => setPasswordVisible(!passwordVisible)}
							className="text-gray-600 dark:text-gray-500"
						>
							{passwordVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
						</IconButton>
					}
					{...form.register('password')}
				/>

				<div className="flex items-center gap-1">
					<Button type="button" onClick={() => form.setValue('password', generateRandomPassword())}>
						<Shield className="mr-1.5 h-4 w-4" /> Generate Random Password
					</Button>
				</div>
			</div>

			<UserPermissionsForm />
			<UserRestrictionsForm />

			<div className="mt-6 flex w-full md:max-w-sm">
				<Button className="w-full md:max-w-sm" variant="primary" disabled={formHasErrors}>
					{t('settingsScene.createUsers.submitButton')}
				</Button>
			</div>
		</Form>
	)
}
