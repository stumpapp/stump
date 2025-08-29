import { zodResolver } from '@hookform/resolvers/zod'
import { useGraphQLMutation, useSDK } from '@stump/client'
import { Alert, AlertDescription, Button, Form, Heading, Text } from '@stump/components'
import { CreateUserInput, extractErrorMessage, graphql, UpdateUserInput } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useForm, useFormState } from 'react-hook-form'
import { useNavigate } from 'react-router'

import { ContentContainer } from '@/components/container'
import paths from '@/paths'

import AccountDetails from './AccountDetails'
import MaxSessionsAllowed from './MaxSessionsAllowed'
import { buildSchema, CreateOrUpdateUserSchema, formDefaults } from './schema'
import UserPermissionsTable from './UserPermissionsTable'
import UserRestrictionsForm from './UserRestrictionsForm'

const updateMutation = graphql(`
	mutation CreateOrUpdateUserFormUpdateUser($id: ID!, $input: UpdateUserInput!) {
		updateUser(id: $id, input: $input) {
			id
			username
			ageRestriction {
				age
				restrictOnUnset
			}
			permissions
			maxSessionsAllowed
		}
	}
`)

const createMutation = graphql(`
	mutation CreateOrUpdateUserFormCreateUser($input: CreateUserInput!) {
		createUser(input: $input) {
			id
		}
	}
`)

interface ExistingUser extends UpdateUserInput {
	id: string
	isServerOwner: boolean
}

type Props = {
	user?: ExistingUser
	existingUsernames: string[]
}

// TODO(design): stepped form from bookclub feature branch

export default function CreateOrUpdateUserForm({ user, existingUsernames }: Props) {
	const { sdk } = useSDK()
	const navigate = useNavigate()

	const { t } = useLocaleContext()

	const isCreating = !user
	const schema = useMemo(
		() => buildSchema(t, existingUsernames, user),
		[t, existingUsernames, user],
	)

	const form = useForm<CreateOrUpdateUserSchema>({
		defaultValues: formDefaults(user),
		resolver: zodResolver(schema),
	})
	const { errors: formErrors } = useFormState({ control: form.control })
	const formHasErrors = useMemo(() => {
		return Object.keys(formErrors).length > 0
	}, [formErrors])

	const client = useQueryClient()

	const { mutate: createUser, error: createError } = useGraphQLMutation(createMutation, {
		onSuccess: async () => {
			await client.refetchQueries({
				predicate: ({ queryKey: [baseKey] }) => baseKey === sdk.cacheKeys.users,
			})
			form.reset()
			navigate(paths.settings('server/users'))
		},
	})

	const { mutate: updateUser, error: updateError } = useGraphQLMutation(updateMutation, {
		onSuccess: async ({ updateUser: result }) => {
			await client.refetchQueries({
				predicate: ({ queryKey: [baseKey] }) => baseKey === sdk.cacheKeys.users,
			})
			form.reset({
				ageRestriction: result.ageRestriction?.age,
				ageRestrictionOnUnset: result.ageRestriction?.restrictOnUnset,
				permissions: result.permissions,
				username: result.username,
			})
			navigate(paths.settings('server/users'))
		},
	})

	const handleSubmit = ({
		username,
		password,
		permissions,
		maxSessionsAllowed,
		// forbiddenTags,
		...ageRestrictionValues
	}: CreateOrUpdateUserSchema) => {
		const ageRestriction = ageRestrictionValues.ageRestriction
			? {
					age: ageRestrictionValues.ageRestriction,
					restrictOnUnset: ageRestrictionValues.ageRestrictionOnUnset ?? false,
				}
			: null
		if (isCreating && password) {
			const input: CreateUserInput = {
				username,
				password,
				permissions,
				maxSessionsAllowed,
				ageRestriction,
			}
			createUser({ input })
		} else if (user) {
			const input: UpdateUserInput = {
				username,
				password: password || null,
				permissions,
				maxSessionsAllowed,
				ageRestriction,
			}
			updateUser({ id: user.id, input })
		}
	}

	const renderErrors = () => {
		return (
			<>
				{createError && (
					<Alert variant="destructive">
						<AlertDescription>{extractErrorMessage(createError)}</AlertDescription>
					</Alert>
				)}
				{updateError && (
					<Alert variant="destructive">
						<AlertDescription>{extractErrorMessage(updateError)}</AlertDescription>
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

				{!user?.isServerOwner && (
					<>
						<UserPermissionsTable />
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
