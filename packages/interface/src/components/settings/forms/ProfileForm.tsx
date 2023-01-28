import { FormControl, FormLabel } from '@chakra-ui/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateUser } from '@stump/api'
import { useMutation, useUserStore } from '@stump/client'
import { UpdateUserArgs } from '@stump/types'
import { FieldValues, useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { z } from 'zod'

import { useLocale } from '../../../hooks/useLocale'
import Button from '../../../ui/Button'
import Form from '../../../ui/Form'
import Input, { PasswordInput } from '../../../ui/Input'
import SettingsSection from '../SettingsSection'

export default function ProfileForm() {
	const { user, setUser } = useUserStore((store) => ({
		setUser: store.setUser,
		user: store.user,
	}))

	if (!user) {
		throw new Error('Unauthorized')
	}

	const { mutateAsync: updateProfile } = useMutation(
		['updateUserProfile', user?.id],
		(params: UpdateUserArgs) => updateUser(user!.id, params).then((res) => res.data),
	)
	const { t } = useLocale()

	const schema = z.object({
		password: z.string().optional(),
		username: z.string().min(1, { message: t('loginPage.form.validation.missingUsername') }),
	})

	const form = useForm({
		defaultValues: {
			username: user.username || '',
		} as FieldValues,
		resolver: zodResolver(schema),
	})

	async function handleSubmit(values: FieldValues) {
		try {
			const updatedUser = await updateProfile(values as UpdateUserArgs)
			setUser(updatedUser)
			toast.success(t('settingsPage.profileForm.success'))
		} catch (error) {
			toast.error(t('settingsPage.profileForm.error'))
		}
	}

	return (
		<SettingsSection title="Account" subtitle="This is just your basic account information">
			<Form form={form} onSubmit={handleSubmit}>
				<FormControl>
					<FormLabel htmlFor="username">
						{t('settingsPage.general.profileForm.labels.username')}
					</FormLabel>
					<Input
						variant="flushed"
						type="text"
						// Note: Not really sure I want autofocus.
						placeholder="Enter a new username"
						{...form.register('username')}
					/>
				</FormControl>

				<FormControl>
					<FormLabel htmlFor="password">
						{t('settingsPage.general.profileForm.labels.password')}
					</FormLabel>

					<PasswordInput
						variant="flushed"
						autoComplete="new-password"
						placeholder="Enter a new password"
						{...form.register('password')}
					/>
				</FormControl>

				<Button alignSelf="end" type="submit" colorScheme="brand">
					Update Account
				</Button>
			</Form>
		</SettingsSection>
	)
}
