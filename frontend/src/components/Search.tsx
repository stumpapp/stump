import {
	InputGroup,
	InputRightElement,
	Kbd,
	useBoolean,
	useColorModeValue,
} from '@chakra-ui/react';
import React, { useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import Input from './ui/Input';

function Shortcut() {
	return <Kbd>⌘k</Kbd>;
}

export default function Search() {
	const inputRef = React.useRef<HTMLInputElement>(null);
	const [expanded, { on, off }] = useBoolean(false);

	useHotkeys('ctrl+k, cmd+k', () => inputRef.current?.focus());

	return (
		<InputGroup w="unset">
			<Input
				ref={inputRef}
				placeholder="Search"
				onFocus={on}
				onBlur={off}
				w={expanded ? 64 : 56}
				bg={useColorModeValue('gray.50', 'gray.800')}
				transition="all 0.2s"
				// TODO: figure out why hotkey won't work, my guess is input focus overrides
				// the hotkey stuff
				onKeyDown={(e) => {
					if (e.key === 'Escape') {
						inputRef.current?.blur();
					}
				}}
			/>
			<InputRightElement children={<Shortcut />} />
		</InputGroup>
	);
}
