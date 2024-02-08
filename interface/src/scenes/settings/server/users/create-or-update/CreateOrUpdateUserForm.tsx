import { zodResolver } from '@hookform/resolvers/zod'
import { userQueryKeys } from '@stump/api'
import { invalidateQueries, useCreateUser, useUpdateUser } from '@stump/client'
import { Alert, Button, Form, Heading, Text } from '@stump/components'
import { User } from '@stump/types'
import React, { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router'
import z from 'zod'

import { ContentContainer } from '@/components/container'
import { useLocaleContext } from '@/i18n'
import paths from '@/paths'

import { useUserManagementContext } from '../context'
import AccountDetails from './AccountDetails'
import MaxSessionsAllowed from './MaxSessionsAllowed'
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
		max_sessions_allowed: z.number().optional(),
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

type Props = {
	user?: User
}

export default function CreateOrUpdateUserForm({ user }: Props) {
	const navigate = useNavigate()

	const { t } = useLocaleContext()
	const { users } = useUserManagementContext()

	const isCreating = !user
	const schema = useMemo(() => buildSchema(t, users, user), [t, users, user])
	const form = useForm<Schema>({
		defaultValues: {
			age_restriction: user?.age_restriction?.age,
			age_restriction_on_unset: user?.age_restriction?.restrict_on_unset,
			max_sessions_allowed: user?.max_sessions_allowed ?? undefined,
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

	const handleSubmit = async ({
		username,
		password,
		permissions,
		max_sessions_allowed,
		...ageRestrictions
	}: Schema) => {
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
					max_sessions_allowed,
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
					max_sessions_allowed,
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
		<Form id="create-user-form" form={form} onSubmit={handleSubmit}>
			<ContentContainer>
				{renderErrors()}

				<div className="flex flex-col gap-6">
					<div>
						<Heading size="sm">Account details</Heading>
						<Text size="sm" variant="muted" className="mt-1.5">
							They can change these values at any time
						</Text>
					</div>

					<AccountDetails />
				</div>

				{!user?.is_server_owner && (
					<>
						<UserPermissionsForm />
						<UserRestrictionsForm />
						<MaxSessionsAllowed />
					</>
				)}

				<div className="mt-6 flex w-full md:max-w-sm">
					<Button className="w-full md:max-w-sm" variant="primary" disabled={formHasErrors}>
						{t(
							isCreating
								? 'settingsScene.server/users.createOrUpdateForm.createSubmitButton'
								: 'settingsScene.server/users.createOrUpdateForm.updateSubmitButton',
						)}
					</Button>
				</div>
			</ContentContainer>
		</Form>
	)
}
