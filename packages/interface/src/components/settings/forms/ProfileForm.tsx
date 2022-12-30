import { FormControl, FormLabel } from '@chakra-ui/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { UpdateUserArgs, useMutation, useUserStore } from '@stump/client'
import { FieldValues, useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { z } from 'zod'

import { updateUser } from '../../../../../client/src/api/user'
import { useLocale } from '../../../hooks/useLocale'
import Button from '../../../ui/Button'
import Form from '../../../ui/Form'
import Input, { PasswordInput } from '../../../ui/Input'
import SettingsSection from '../SettingsSection'

export default function ProfileForm() {
	const { user, setUser } = useUserStore()
	const { mutateAsync: updateProfile } = useMutation(
		['updateUserProfile', user?.id],
		(params: UpdateUserArgs) => updateUser(user!.id, params).then((res) => res.data),
	)
	const { t } = useLocale()

	if (!user) {
		return null
	}

	const schema = z.object({
		password: z.string().optional(),
		username: z.string().min(1, { message: t('loginPage.form.validation.missingUsername') }),
	})

	const form = useForm({
		defaultValues: {
			username: user.username,
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
