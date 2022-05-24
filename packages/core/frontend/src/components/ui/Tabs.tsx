import React from 'react';
import { forwardRef, TabProps, Tab as ChakraTab } from '@chakra-ui/react';

export const Tab = forwardRef((props: TabProps, ref) => {
	// this worked like DOODY
	// const tabProps = useTab({ ...props, ref });

	return (
		<ChakraTab
			ref={ref}
			{...props}
			_focus={{
				boxShadow: 'none',
				outline: 'none',
			}}
			_active={{
				boxShadow: 'none',
				outline: 'none',
			}}
		/>
	);
});
