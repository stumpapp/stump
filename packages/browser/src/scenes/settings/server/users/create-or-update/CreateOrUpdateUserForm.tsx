import { zodResolver } from '@hookform/resolvers/zod'
import { invalidateQueries, useCreateUser, useSDK, useUpdateUser } from '@stump/client'
import { Alert, Button, Form, Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { User } from '@stump/sdk'
import React, { useMemo } from 'react'
import { useForm, useFormState } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router'

import { ContentContainer } from '@/components/container'
import paths from '@/paths'

import { useUserManagementContext } from '../context'
import AccountDetails from './AccountDetails'
import MaxSessionsAllowed from './MaxSessionsAllowed'
import { buildSchema, CreateOrUpdateUserSchema, formDefaults } from './schema'
import UserPermissionsForm from './UserPermissionsForm'
import UserRestrictionsForm from './UserRestrictionsForm'

type Props = {
	user?: User
}

// TODO(design): stepped form from bookclub feature branch

export default function CreateOrUpdateUserForm({ user }: Props) {
	const { sdk } = useSDK()
	const navigate = useNavigate()

	const { t } = useLocaleContext()
	const { users } = useUserManagementContext()

	const isCreating = !user
	const schema = useMemo(() => buildSchema(t, users, user), [t, users, user])

	const form = useForm<CreateOrUpdateUserSchema>({
		defaultValues: formDefaults(user),
		resolver: zodResolver(schema),
	})
	const { errors: formErrors } = useFormState({ control: form.control })
	const formHasErrors = useMemo(() => {
		return Object.keys(formErrors).length > 0
	}, [formErrors])

	const { createAsync, error: createError } = useCreateUser()
	const { updateAsync, error: updateError } = useUpdateUser(user?.id)

	const handleSubmit = async ({
		username,
		password,
		permissions,
		max_sessions_allowed,
		...ageRestrictions
	}: CreateOrUpdateUserSchema) => {
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
				await invalidateQueries({ keys: [sdk.user.keys.get, sdk.user.keys.getByID] })
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
				await invalidateQueries({ keys: [sdk.user.keys.get, sdk.user.keys.getByID] })
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
					<Button
						type="submit"
						className="w-full md:max-w-sm"
						variant="primary"
						disabled={formHasErrors}
					>
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
