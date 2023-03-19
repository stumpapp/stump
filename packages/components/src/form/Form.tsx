import React, { forwardRef } from 'react'
import { FieldValues, FormProvider, SubmitHandler, UseFormReturn } from 'react-hook-form'

export type FormProps = {
	form: UseFormReturn<FieldValues>
	onSubmit: SubmitHandler<FieldValues>
} & React.ComponentPropsWithoutRef<'form'>

export const Form = forwardRef<HTMLFormElement, FormProps>(
	({ form, onSubmit, children, ...props }, ref) => {
		return (
			<FormProvider {...form}>
				<form ref={ref} onSubmit={form.handleSubmit(onSubmit)} {...props}>
					<fieldset className="flex flex-col gap-4" disabled={form.formState.isSubmitting}>
						{children}
					</fieldset>
				</form>
			</FormProvider>
		)
	},
)
Form.displayName = 'Form'
