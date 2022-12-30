import {
	Button as ChakraButton,
	ButtonProps as ChakraButtonProps,
	forwardRef,
	ModalCloseButton as ChakraModalCloseButton,
} from '@chakra-ui/react'

import ShortcutToolTip from '../components/ShortcutToolTip'
import ToolTip from './ToolTip'

export interface ButtonProps extends ChakraButtonProps {
	// TODO: change shortcutAction to toolTipLabel, more generic.
	// when shortcutKeybind is present, we know it is a shortcutAction.
	shortcutAction?: string
	shortcutKeybind?: string[]
}

export default forwardRef<ButtonProps, 'button'>((props, ref) => {
	const { shortcutKeybind, shortcutAction, ...rest } = props

	const button = (
		<ChakraButton
			ref={ref}
			{...rest}
			_focus={{
				boxShadow: '0 0 0 2px rgba(196, 130, 89, 0.6);',
			}}
		/>
	)

	if (shortcutKeybind) {
		return (
			<ShortcutToolTip shortcutAction={shortcutAction} keybind={shortcutKeybind}>
				{button}
			</ShortcutToolTip>
		)
	} else if (shortcutAction) {
		return <ToolTip label={shortcutAction}>{button}</ToolTip>
	}

	return button
})

export const IconButton = forwardRef<ButtonProps, 'button'>((props, ref) => {
	const { shortcutKeybind, shortcutAction, ...rest } = props

	const button = (
		<ChakraButton
			ref={ref}
			variant="ghost"
			cursor={'pointer'}
			p={0.5}
			size="sm"
			{...rest}
			_focus={{
				boxShadow: '0 0 0 2px rgba(196, 130, 89, 0.6);',
			}}
		/>
	)

	if (shortcutKeybind) {
		return (
			<ShortcutToolTip shortcutAction={shortcutAction} keybind={shortcutKeybind}>
				{button}
			</ShortcutToolTip>
		)
	} else if (shortcutAction) {
		return <ToolTip label={shortcutAction}>{button}</ToolTip>
	}

	return button
})

export const ModalCloseButton = forwardRef<ButtonProps, 'button'>((props, ref) => (
	<ChakraModalCloseButton
		ref={ref}
		{...props}
		_focus={{
			boxShadow: '0 0 0 2px rgba(196, 130, 89, 0.6);',
		}}
	/>
))
