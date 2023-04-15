import { IconButton } from '@stump/components'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useNavigate } from 'react-router-dom'

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
		<div className="m-0 hidden items-center gap-1 md:flex">
			<IconButton
				// shortcutAction="Go back"
				// shortcutKeybind={['⌘', '[']}
				variant="ghost"
				size="sm"
				onClick={navigateBackward}
			>
				<ChevronLeft size="0.75rem" />
			</IconButton>

			<IconButton
				// shortcutAction="Go forward"
				// shortcutKeybind={['⌘', ']']}
				variant="ghost"
				size="sm"
				onClick={navigateForward}
			>
				<ChevronRight size="0.75rem" />
			</IconButton>
		</div>
	)
}
