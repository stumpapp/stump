import React from 'react';
import { forwardRef, Input, InputProps, Stack, Text } from '@chakra-ui/react';

interface Props extends InputProps {
	label?: string;
	fullWidth?: boolean;
}

export default forwardRef<Props, 'input'>(({ label, fullWidth = true, ...props }, ref) => {
	return (
		<Stack spacing={2} w={fullWidth ? 'full' : undefined}>
			{label && <Text>{label}</Text>}
			<Input ref={ref} errorBorderColor="crimson" {...props} />
		</Stack>
	);
});
