import { Eye, EyeOff } from 'lucide-react'
import { forwardRef, useState } from 'react'

import { Input, InputProps } from './Input'

type Props = Omit<InputProps, 'rightDecoration'>

export const PasswordInput = forwardRef<HTMLInputElement, Props>((props, ref) => {
	const [showPassword, setShowPassword] = useState(false)

	return (
		<Input
			{...props}
			ref={ref}
			type={showPassword ? 'text' : 'password'}
			rightDecoration={
				<button
					title={showPassword ? 'Hide password' : 'Show password'}
					type="button"
					onClick={() => setShowPassword((prev) => !prev)}
					className="inset-y-0 right-0 pr-3 absolute flex items-center"
				>
					{showPassword ? (
						<Eye className="h-4 w-4 text-foreground-muted" />
					) : (
						<EyeOff className="h-4 w-4 text-foreground-muted" />
					)}
				</button>
			}
		/>
	)
})
PasswordInput.displayName = 'PasswordInput'
