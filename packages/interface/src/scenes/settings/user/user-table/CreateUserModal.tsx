import { zodResolver } from '@hookform/resolvers/zod'
import { userQueryKeys } from '@stump/api'
import { invalidateQueries, useCreateUser } from '@stump/client'
import { Alert, Button, Dialog, Form, IconButton, Input } from '@stump/components'
import { Eye, EyeOff, Plus, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import z from 'zod'

import { useLocaleContext } from '../../../../i18n'
import { useUserManagementContext } from '../context'

export default function CreateUserModal() {
	const { t } = useLocaleContext()

	const [isOpen, setIsOpen] = useState(false)
	const [passwordVisible, setPasswordVisible] = useState(false)

	const { users } = useUserManagementContext()
	const { createAsync, isLoading: isCreatingUser, error } = useCreateUser()

	const schema = z.object({
		// TODO: change locale source
		password: z.string().min(1, { message: t('authScene.form.validation.missingPassword') }),
		username: z
			.string()
			.min(1, { message: t('authScene.form.validation.missingUsername') })
			.refine(
				(value) => users?.every((user) => user.username !== value),
				(value) => ({ message: `${value} is already taken` }),
			),
	})
	type Schema = z.infer<typeof schema>

	const form = useForm<Schema>({
		resolver: zodResolver(schema),
	})

	const generateRandomPassword = () => {
		const length = 16
		const charset =
			'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~}{[]:;?'
		let randomValue = ''
		for (let i = 0, n = charset.length; i < length; ++i) {
			randomValue += charset.charAt(Math.floor(Math.random() * n))
		}
		form.setValue('password', randomValue)
	}

	const handleOpenStateChange = () => {
		if (isOpen && isCreatingUser) {
			return
		}

		setIsOpen((prev) => !prev)
	}

	const handleSubmit = async ({ username, password }: Schema) => {
		try {
			await createAsync({ password, username })
			await invalidateQueries({ queryKey: [userQueryKeys.getUsers] })
			setIsOpen(false)
			toast.success('User created successfully')
		} catch (error) {
			console.error(error)
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenStateChange}>
			<Dialog.Trigger asChild>
				<Button variant="outline" size="sm">
					<Plus className="mr-1.5 h-4 w-4" />
					Create User
				</Button>
			</Dialog.Trigger>
			<Dialog.Content size="lg">
				<Dialog.Header>
					<Dialog.Title>Create User Account</Dialog.Title>
					<Dialog.Description>
						Enter a default username and password for your managed user account. They will be able
						to change their password once they log in.
					</Dialog.Description>
					<Dialog.Close disabled={isCreatingUser} />
				</Dialog.Header>

				<Form id="create-user-form" form={form} onSubmit={handleSubmit} className="py-2">
					{error && (
						<Alert level="error">
							<Alert.Content>{error.message}</Alert.Content>
						</Alert>
					)}
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
								size="xs"
								onClick={() => setPasswordVisible(!passwordVisible)}
							>
								{passwordVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
							</IconButton>
						}
						{...form.register('password')}
					/>
					<div className="flex items-center gap-1">
						<Button type="button" size="xs" onClick={generateRandomPassword}>
							<RotateCcw className="mr-1.5 h-4 w-4" /> Generate Random Password
						</Button>
					</div>
				</Form>

				<Dialog.Footer>
					<Button onClick={() => setIsOpen(false)} disabled={isCreatingUser}>
						Cancel
					</Button>
					<Button
						variant="primary"
						type="submit"
						form="create-user-form"
						isLoading={isCreatingUser}
						disabled={isCreatingUser}
					>
						Create User
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog>
	)
}
