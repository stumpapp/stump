import { forwardRef, Tab as ChakraTab, TabProps } from '@chakra-ui/react'

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
	)
})
