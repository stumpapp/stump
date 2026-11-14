import { forwardRef } from 'react'
import { FieldValues, FormProvider, SubmitHandler, UseFormReturn } from 'react-hook-form'

import { cn } from '../utils'

export type FormProps<
	TFieldValues extends FieldValues,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	TContext = any,
	TTransformedValues = TFieldValues,
> = {
	form: UseFormReturn<TFieldValues, TContext, TTransformedValues>
	onSubmit: SubmitHandler<TTransformedValues>
	fieldsetClassName?: string
} & Omit<React.ComponentProps<'form'>, 'onSubmit'>

export function Form<
	TFieldValues extends FieldValues,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	TContext = any,
	TTransformedValues = TFieldValues,
>({
	form,
	onSubmit,
	children,
	fieldsetClassName,
	...props
}: FormProps<TFieldValues, TContext, TTransformedValues>) {
	return (
		<FormProvider {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} {...props}>
				<fieldset
					className={cn('min-w-0 gap-4 flex flex-col', fieldsetClassName)}
					disabled={form.formState.isSubmitting}
				>
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
