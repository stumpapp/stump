import type { FormControlProps as ChakraFormControlProps } from '@chakra-ui/react'
import { FormControl as ChakraFormControl, forwardRef, VStack } from '@chakra-ui/react'
import React from 'react'
import { FieldValues, FormProvider, SubmitHandler, UseFormReturn } from 'react-hook-form'

interface FormProps {
	form: UseFormReturn<FieldValues>
	onSubmit: SubmitHandler<FieldValues>
}

type Props = FormProps & React.ComponentProps<'form'>

export default function Form({ form, onSubmit, children, ...props }: Props) {
	return (
		<FormProvider {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} {...props}>
				<VStack spacing={4} as="fieldset" disabled={form.formState.isSubmitting}>
					{children}
				</VStack>
			</form>
		</FormProvider>
	)
}

export const FormControl = forwardRef<ChakraFormControlProps, 'div'>((props, ref) => (
	<ChakraFormControl
		ref={ref}
		{...props}
		_focus={{
			boxShadow: '0 0 0 2px rgba(196, 130, 89, 0.6);',
		}}
	/>
))
