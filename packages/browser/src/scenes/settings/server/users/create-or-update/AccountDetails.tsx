import { Button, Input, InputGroup, Label, Text } from '@stump/components'
import { Eye, EyeOff, Shield } from 'lucide-react'
import { useState } from 'react'
import { useFormContext, useFormState } from 'react-hook-form'

import { CreateOrUpdateUserSchema } from './schema'

export default function AccountDetails() {
	const form = useFormContext<CreateOrUpdateUserSchema>()
	const { errors } = useFormState({ control: form.control })

	const [passwordVisible, setPasswordVisible] = useState(false)

	return (
		<div className="gap-4 pb-4 pt-1 md:max-w-md flex flex-col">
			<Input
				id="username"
				fullWidth
				label="Username"
				placeholder="Username"
				autoComplete="off"
				errorMessage={errors.username?.message}
				{...form.register('username')}
			/>

			<div className="gap-2 grid w-full items-center">
				<Label htmlFor="password">Password</Label>

				<InputGroup>
					<InputGroup.Input
						id="password"
						data-testid="password"
						placeholder="Password"
						type={passwordVisible ? 'text' : 'password'}
						autoComplete="off"
						aria-invalid={!!errors.password?.message}
						{...form.register('password')}
					/>

					<InputGroup.Addon align="inline-end">
						<InputGroup.Button
							type="button"
							variant="ghost"
							size="icon-xs"
							onClick={() => setPasswordVisible(!passwordVisible)}
							className="text-muted-foreground"
							data-testid="togglePasswordVisibility"
						>
							{passwordVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
						</InputGroup.Button>
					</InputGroup.Addon>
				</InputGroup>

				{errors.password?.message && (
					<Text variant="danger" size="xs" className="break-all">
						{errors.password.message}
					</Text>
				)}
			</div>

			<div className="gap-1 flex items-center">
				<Button
					type="button"
					onClick={() => form.setValue('password', generateRandomPassword())}
					data-testid="generatePassword"
				>
					<Shield className="mr-1.5 h-4 w-4" /> Generate Random Password
				</Button>
			</div>
		</div>
	)
}

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
