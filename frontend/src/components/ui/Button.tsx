import React from 'react';
import {
	ButtonProps as ChakraButtonProps,
	Button as ChakraButton,
	forwardRef,
} from '@chakra-ui/react';

export interface ButtonProps extends ChakraButtonProps {}

export default forwardRef<ButtonProps, 'button'>((props, ref) => (
	<ChakraButton
		ref={ref}
		{...props}
		_focus={{
			boxShadow: '0 0 0 2px rgba(196, 130, 89, 0.6);',
		}}
	/>
));
