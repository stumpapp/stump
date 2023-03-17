import { HStack, useColorModeValue } from '@chakra-ui/react'
import { useTopBarStore } from '@stump/client'
import { CaretLeft, CaretRight } from 'phosphor-react'
import { useCallback } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { To, useNavigate } from 'react-router-dom'

import Button from '../../ui/Button'

export default function NavigationButtons() {
	const navigate = useNavigate()

	// FIXME: still not a perfect solution, but it works for now.
	// https://github.com/remix-run/react-router/discussions/8782
	const { backwardsUrl, forwardsUrl } = useTopBarStore(({ backwardsUrl, forwardsUrl }) => ({
		backwardsUrl,
		forwardsUrl,
	}))

	const navigateForward = useCallback(() => {
		if (forwardsUrl != undefined) {
			navigate(forwardsUrl as To)
		} else if (forwardsUrl !== 0) {
			navigate(1)
		}
	}, [navigate, forwardsUrl])

	const navigateBackward = useCallback(() => {
		if (backwardsUrl) {
			navigate(backwardsUrl as To)
		} else if (backwardsUrl !== 0) {
			navigate(-1)
		}
	}, [navigate, backwardsUrl])

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
				disabled={backwardsUrl === 0}
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
				disabled={forwardsUrl === 0}
			>
				<CaretRight size="0.75rem" />
			</Button>
		</HStack>
	)
}
