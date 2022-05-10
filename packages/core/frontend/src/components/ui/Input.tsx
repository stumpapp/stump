import React, { useMemo } from 'react';
import { forwardRef, Input, InputProps, Stack, Text, useBoolean } from '@chakra-ui/react';

interface Props extends InputProps {
	label?: string;
	fullWidth?: boolean;
}

export default forwardRef<Props, 'input'>(({ label, fullWidth = true, ...props }, ref) => {
	return (
		<Stack spacing={2} w={fullWidth ? 'full' : undefined}>
			{label && <Text>{label}</Text>}
			<Input
				ref={ref}
				errorBorderColor="crimson"
				{...props}
				_focus={{
					boxShadow: '0 0 0 2px rgba(196, 130, 89, 0.6);',
				}}
			/>
		</Stack>
	);
});
