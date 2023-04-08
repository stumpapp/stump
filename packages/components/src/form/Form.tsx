import React, { forwardRef } from 'react'
import { FieldValues, FormProvider, SubmitHandler, UseFormReturn } from 'react-hook-form'

import { type Any } from '..'

type FormProps<T extends FieldValues = Any> = {
	form: UseFormReturn<T>
	onSubmit: SubmitHandler<T>
} & Omit<React.ComponentProps<'form'>, 'onSubmit'>

export function Form<T extends FieldValues>({ form, onSubmit, children, ...props }: FormProps<T>) {
	return (
		<FormProvider {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} {...props}>
				<fieldset className="flex min-w-0 flex-col gap-4" disabled={form.formState.isSubmitting}>
					{children}
				</fieldset>
			</form>
		</FormProvider>
	)
}

export const FormSection = forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
	({ children, ...props }, ref) => {
		return (
			<div ref={ref} {...props}>
				{children}
			</div>
		)
	},
)
FormSection.displayName = 'FormSection'
