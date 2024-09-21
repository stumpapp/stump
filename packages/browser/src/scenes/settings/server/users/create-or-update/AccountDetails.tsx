import { Button, IconButton, Input } from '@stump/components'
import { Eye, EyeOff, Shield } from 'lucide-react'
import React, { useState } from 'react'
import { useFormContext, useFormState } from 'react-hook-form'

import { CreateOrUpdateUserSchema } from './schema'

export default function AccountDetails() {
	const form = useFormContext<CreateOrUpdateUserSchema>()
	const { errors } = useFormState({ control: form.control })

	const [passwordVisible, setPasswordVisible] = useState(false)

	return (
		<div className="flex flex-col gap-4 pb-4 pt-1 md:max-w-md">
			<Input
				id="username"
				variant="primary"
				fullWidth
				label="Username"
				placeholder="Username"
				autoComplete="off"
				errorMessage={errors.username?.message}
				{...form.register('username')}
			/>
			<Input
				id="password"
				variant="primary"
				fullWidth
				label="Password"
				placeholder="Password"
				errorMessage={errors.password?.message}
				type={passwordVisible ? 'text' : 'password'}
				autoComplete="off"
				rightDecoration={
					<IconButton
						type="button"
						variant="ghost"
						size="xs"
						onClick={() => setPasswordVisible(!passwordVisible)}
						className="text-foreground-muted"
						data-testid="togglePasswordVisibility"
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
