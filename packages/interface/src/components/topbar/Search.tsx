import { InputGroup, InputRightElement, Kbd, useBoolean, useColorModeValue } from '@chakra-ui/react'
import { MagnifyingGlass } from 'phosphor-react'
import React, { FormEvent, useMemo } from 'react'
import toast from 'react-hot-toast'
import { useHotkeys } from 'react-hotkeys-hook'

import Input from '../../ui/Input'

function Shortcut({ visible }: { visible?: boolean }) {
	// FIXME: don't use deprecated
	const key = window.navigator.platform.match(/^Mac/) ? '⌘k' : 'ctrl+k'

	return (
		<Kbd hidden={!visible} mr={key === 'ctrl+k' ? 8 : undefined}>
			{key}
		</Kbd>
	)
}

// TODO: I think I am going to remove this component from the TopBar. It interferes with the
// UI of the navigation and the title. I think a potential solution would be to have the search
// be solely rendered via keybind, and have it be in a portal.
export default function Search() {
	const inputRef = React.useRef<HTMLInputElement>(null)
	const [expanded, { on, off }] = useBoolean(false)

	useHotkeys('ctrl+k, cmd+k', () => inputRef.current?.focus())

	const width = useMemo(() => {
		if (expanded) {
			return { base: 44, md: 72 }
		}

		return { base: 28, md: 52 }
	}, [expanded])

	function handleSubmit(e: FormEvent) {
		e.preventDefault()

		toast.error("I don't support search yet, check back soon!")
	}

	return (
		<form onSubmit={handleSubmit}>
			<InputGroup w="unset">
				<Input
					ref={inputRef}
					placeholder="Search"
					onFocus={on}
					onBlur={off}
					w={width}
					bg={useColorModeValue('gray.50', 'gray.800')}
					transition="all 0.2s"
					onKeyDown={(e) => {
						if (e.key === 'Escape') {
							inputRef.current?.blur()
						}
					}}
				/>
				<InputRightElement
					display={{ base: 'none', md: 'flex' }}
					children={<Shortcut visible={!expanded} />}
				/>
				<InputRightElement display={{ base: 'flex', md: 'none' }} children={<MagnifyingGlass />} />
			</InputGroup>
		</form>
	)
}
