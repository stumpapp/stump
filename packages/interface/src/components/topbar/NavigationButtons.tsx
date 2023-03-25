import { HStack, useColorModeValue } from '@chakra-ui/react'
import { CaretLeft, CaretRight } from 'phosphor-react'
import { useCallback } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useNavigate } from 'react-router-dom'

import Button from '../../ui/Button'

export default function NavigationButtons() {
	const navigate = useNavigate()

	const navigateForward = useCallback(() => {
		navigate(1)
	}, [navigate])

	const navigateBackward = useCallback(() => {
		navigate(-1)
	}, [navigate])

	// FIXME: this is pretty buggy, but it works for now.
	// TODO: platform specific keybinds
	useHotkeys('ctrl+], cmd+],ctrl+[, cmd+[', (e) => {
		e.preventDefault()
		if (e.key === ']') {
			navigateForward()
		} else if (e.key === '[') {
			navigateBackward()
		}
	})

	return (
		<HStack
			// >:( this won't work, probably some annoying thing with parent stack
			// ml={0}
			style={{ margin: 0 }}
			spacing={1}
			alignItems="center"
			display={{ base: 'none', md: 'flex' }}
		>
			<Button
				shortcutAction="Go back"
				shortcutKeybind={['⌘', '[']}
				variant="ghost"
				p="0.5"
				// FIXME: literally why won't this work >:(
				// size={{ base: 'sm', sm: 'xs' }}
				size="sm"
				_hover={{ bg: useColorModeValue('gray.200', 'gray.750') }}
				onClick={navigateBackward}
			>
				<CaretLeft size="0.75rem" />
			</Button>

			<Button
				shortcutAction="Go forward"
				shortcutKeybind={['⌘', ']']}
				variant="ghost"
				p="0.5"
				// size={{ base: 'sm', sm: 'xs' }}
				size="sm"
				_hover={{ bg: useColorModeValue('gray.200', 'gray.750') }}
				onClick={navigateForward}
			>
				<CaretRight size="0.75rem" />
			</Button>
		</HStack>
	)
}
