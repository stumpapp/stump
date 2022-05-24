import React from 'react';
import { forwardRef, Textarea, TextareaProps } from '@chakra-ui/react';

interface Props extends TextareaProps {
	fullWidth?: boolean;
}

export default forwardRef<Props, 'textarea'>(({ fullWidth = true, ...props }, ref) => {
	return (
		<Textarea
			w={fullWidth ? 'full' : undefined}
			ref={ref}
			errorBorderColor="crimson"
			{...props}
			_focus={{
				boxShadow: '0 0 0 2px rgba(196, 130, 89, 0.6);',
			}}
		/>
	);
});
