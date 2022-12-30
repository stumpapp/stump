import type { CheckboxProps as ChakraCheckboxProps } from '@chakra-ui/react'
import { Checkbox as ChakraCheckbox, forwardRef } from '@chakra-ui/react'

export type CheckboxProps = ChakraCheckboxProps

export default forwardRef<CheckboxProps, 'input'>((props, ref) => (
	<ChakraCheckbox
		ref={ref}
		{...props}
		_focus={{
			boxShadow: '0 0 0 2px rgba(196, 130, 89, 0.6);',
		}}
	/>
))
