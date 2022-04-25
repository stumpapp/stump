import { VStack } from '@chakra-ui/react';
import React from 'react';
import { FormProvider, UseFormReturn, FieldValues, SubmitHandler } from 'react-hook-form';

interface FormProps {
	form: UseFormReturn<FieldValues>;
	onSubmit: SubmitHandler<FieldValues>;
}

type Props = FormProps & React.ComponentProps<'form'>;

export default function Form({ form, onSubmit, children, ...props }: Props) {
	return (
		<FormProvider {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} {...props}>
				<VStack spacing={4} as="fieldset" disabled={form.formState.isSubmitting}>
					{children}
				</VStack>
			</form>
		</FormProvider>
	);
}
