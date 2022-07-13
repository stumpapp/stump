import React, { useMemo, useState } from 'react';
import { forwardRef, Input as ChakraInput, InputProps } from '@chakra-ui/react';

interface Props extends InputProps {
	// label?: string;
	fullWidth?: boolean;
}

const Input = forwardRef<Props, 'input'>(({ fullWidth = true, ...props }, ref) => {
	const { _focus, _focusVisible } = useMemo(() => {
		if (props.variant === 'flushed') {
			return {
				_focus: {
					boxShadow: '0px 2px 0px 0px rgba(196, 130, 89, 0.6);',
				},
				_focusVisible: {
					borderBottom: '1px rgba(196, 130, 89, 0.4);',
				},
			};
		}

		return {
			_focus: {
				boxShadow: '0 0 0 2px rgba(196, 130, 89, 0.6);',
			},
			_focusVisible: {
				border: 'rgba(196, 130, 89, 0.4);',
			},
		};
	}, [props.variant]);

	return (
		<ChakraInput
			w={fullWidth ? 'full' : undefined}
			ref={ref}
			errorBorderColor="red.400"
			{...props}
			// TODO: shouldnt use brand color on error state
			_focus={_focus}
			_focusVisible={_focusVisible}
		/>
	);
});

export default Input;

interface DebouncedProps extends Props {
	delay?: number;
	onInputStop(value?: string): void;
}

export const DebouncedInput = forwardRef<DebouncedProps, 'input'>(
	({ delay = 500, onChange, onInputStop, ...props }, ref) => {
		const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

		function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
			onChange?.(e);

			if (timer) {
				clearTimeout(timer);
			}

			const newTimeout = setTimeout(() => onInputStop(e.target?.value), delay);

			setTimer(newTimeout);
		}

		return <Input ref={ref} {...props} onChange={onInputChange} />;
	},
);
