import React from 'react';
import { forwardRef, Input, InputProps } from '@chakra-ui/react';

interface Props extends InputProps {
	// label?: string;
	fullWidth?: boolean;
}

export default forwardRef<Props, 'input'>(({ fullWidth = true, ...props }, ref) => {
	return (
		<Input
			w={fullWidth ? 'full' : undefined}
			ref={ref}
			errorBorderColor="red.400"
			{...props}
			// TODO: shouldnt use brand color on error state
			_focus={{
				boxShadow: '0 0 0 2px rgba(196, 130, 89, 0.6);',
			}}
		/>
	);
});
