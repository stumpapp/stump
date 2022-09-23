import {
	ButtonProps as ChakraButtonProps,
	Button as ChakraButton,
	ModalCloseButton as ChakraModalCloseButton,
	forwardRef,
} from '@chakra-ui/react';
import ShortcutToolTip from '../components/ShortcutToolTip';

export interface ButtonProps extends ChakraButtonProps {
	shortcutAction?: string;
	shortcutKeybind?: string;
}

export default forwardRef<ButtonProps, 'button'>((props, ref) => {
	const { shortcutKeybind, shortcutAction, ...rest } = props;

	const button = (
		<ChakraButton
			ref={ref}
			{...rest}
			_focus={{
				boxShadow: '0 0 0 2px rgba(196, 130, 89, 0.6);',
			}}
		/>
	);

	if (shortcutKeybind) {
		return (
			<ShortcutToolTip shortcutAction={shortcutAction} keybind={shortcutKeybind}>
				{button}
			</ShortcutToolTip>
		);
	}

	return button;
});

export const IconButton = forwardRef<ButtonProps, 'button'>((props, ref) => (
	<ChakraButton
		ref={ref}
		variant="ghost"
		cursor={'pointer'}
		p={0.5}
		size="sm"
		{...props}
		_focus={{
			boxShadow: '0 0 0 2px rgba(196, 130, 89, 0.6);',
		}}
	/>
));

export const ModalCloseButton = forwardRef<ButtonProps, 'button'>((props, ref) => (
	<ChakraModalCloseButton
		ref={ref}
		{...props}
		_focus={{
			boxShadow: '0 0 0 2px rgba(196, 130, 89, 0.6);',
		}}
	/>
));
