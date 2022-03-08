import React from 'react';
import { forwardRef, Input, InputProps, Stack, Text } from '@chakra-ui/react';

interface Props extends InputProps {
	label?: string;
}

export default forwardRef<Props, 'input'>(({ label, ...props }, ref) => {
	return (
		<Stack spacing={2}>
			{label && <Text>{label}</Text>}
			<Input ref={ref} errorBorderColor="crimson" {...props} />
		</Stack>
	);
});
