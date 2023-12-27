import { zodResolver } from '@hookform/resolvers/zod'
import { userQueryKeys } from '@stump/api'
import { invalidateQueries, useCreateUser, useUpdateUser } from '@stump/client'
import { Alert, Button, Form, Heading, IconButton, Input, Text } from '@stump/components'
import { User } from '@stump/types'
import { Eye, EyeOff, Shield } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router'
import z from 'zod'

import { useLocaleContext } from '@/i18n'
import paths from '@/paths'

import { useUserManagementContext } from '../context'
import UserPermissionsForm, { userPermissionSchema } from './UserPermissionsForm'
import UserRestrictionsForm from './UserRestrictionsForm'

const buildSchema = (t: (key: string) => string, existingUsers: User[], updatingUser?: User) =>
	z.object({
		age_restriction: z
			.number()
			.optional()
			.refine((value) => value == undefined || value >= 0, {
				message: t('settingsScene.server/users.createOrUpdateForm.validation.ageRestrictionTooLow'),
			}),
		age_restriction_on_unset: z.boolean().optional(),
		forbidden_tags: z.array(z.string()).optional(),
		password: z
			.string()
			// .min(1, { message: t('authScene.form.validation.missingPassword') })
			.optional()
			.refine(
				// if we are updating a user, we don't need to validate the password
				(value) => !!updatingUser || !!value,
				() => ({ message: t('authScene.form.validation.missingPassword') }),
			),
		permissions: z.array(userPermissionSchema).optional(),
		username: z
			.string()
			.min(1, { message: t('authScene.form.validation.missingUsername') })
			.refine(
				(value) =>
					(!!updatingUser && value === updatingUser.username) ||
					existingUsers.every((user) => user.username !== value),
				(value) => ({ message: `${value} is already taken` }),
			),
	})
export type Schema = z.infer<ReturnType<typeof buildSchema>>

const generateRandomPassword = (length = 16) => {
	// FIXME: this should probably be moved to the server and be a secret lol very insecure
	const charset =
		'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~}{[]:;?'
	let randomValue = ''
	for (let i = 0, n = charset.length; i < length; ++i) {
		randomValue += charset.charAt(Math.floor(Math.random() * n))
	}
	return randomValue
}

type Props = {
	user?: User
}

export default function CreateOrUpdateUserForm({ user }: Props) {
	const navigate = useNavigate()
	const [passwordVisible, setPasswordVisible] = useState(false)

	const { t } = useLocaleContext()
	const { users } = useUserManagementContext()

	const isCreating = !user
	const schema = useMemo(() => buildSchema(t, users, user), [t, users, user])
	const form = useForm<Schema>({
		defaultValues: {
			age_restriction: user?.age_restriction?.age,
			age_restriction_on_unset: user?.age_restriction?.restrict_on_unset,
			permissions: user?.permissions,
			username: user?.username,
		},
		resolver: zodResolver(schema),
	})
	const formHasErrors = useMemo(() => {
		return Object.keys(form.formState.errors).length > 0
	}, [form.formState])

	const { createAsync, error: createError } = useCreateUser()
	const { updateAsync, error: updateError } = useUpdateUser(user?.id)

	const handleSubmit = async ({ username, password, permissions, ...ageRestrictions }: Schema) => {
		try {
			const age_restriction = ageRestrictions.age_restriction
				? {
						age: ageRestrictions.age_restriction,
						restrict_on_unset: ageRestrictions.age_restriction_on_unset ?? false,
				  }
				: null

			if (isCreating && password) {
				const result = await createAsync({
					age_restriction,
					password: password,
					permissions,
					username,
				})
				console.debug('Created user', { result })
				toast.success('User created successfully')
				await invalidateQueries({ keys: [userQueryKeys.getUsers, userQueryKeys.getUserById] })
				form.reset()
			} else if (user) {
				const result = await updateAsync({
					...user,
					age_restriction,
					password: password || null,
					permissions,
					username,
				})
				console.debug('Updated user', { result })
				toast.success('User updated successfully')
				await invalidateQueries({ keys: [userQueryKeys.getUsers, userQueryKeys.getUserById] })
				form.reset({
					age_restriction: result.age_restriction?.age,
					age_restriction_on_unset: result.age_restriction?.restrict_on_unset,
					permissions: result.permissions,
					username: result.username,
				})
			}

			navigate(paths.settings('server/users'))
		} catch (error) {
			console.error(error)
		}
	}

	const renderErrors = () => {
		return (
			<>
				{createError && (
					<Alert level="error">
						<Alert.Content>{createError.message}</Alert.Content>
					</Alert>
				)}
				{updateError && (
					<Alert level="error">
						<Alert.Content>{updateError.message}</Alert.Content>
					</Alert>
				)}
			</>
		)
	}

	return (
		<Form
			id="create-user-form"
			form={form}
			onSubmit={handleSubmit}
			fieldsetClassName="flex flex-col gap-y-12"
		>
			{renderErrors()}

			<div className="flex flex-col gap-4">
				<div>
					<Heading size="sm">Account details</Heading>
					<Text size="sm" variant="muted" className="mt-1">
						They can change these values at any time
					</Text>
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
						<Button
							type="button"
							onClick={() => form.setValue('password', generateRandomPassword())}
						>
							<Shield className="mr-1.5 h-4 w-4" /> Generate Random Password
						</Button>
					</div>
				</div>
			</div>

			{!user?.is_server_owner && (
				<>
					<UserPermissionsForm />
					<UserRestrictionsForm />
				</>
			)}

			<div className="mt-6 flex w-full md:max-w-sm">
				<Button className="w-full md:max-w-sm" variant="primary" disabled={formHasErrors}>
					{t(
						isCreating
							? 'settingsScene.createOrUpdateUsers.createSubmitButton'
							: 'settingsScene.createOrUpdateUsers.updateSubmitButton',
					)}
				</Button>
			</div>
		</Form>
	)
}
