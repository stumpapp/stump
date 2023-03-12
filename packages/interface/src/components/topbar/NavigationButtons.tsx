import { useTopBarStore } from '@stump/client'
import { IconButton } from '@stump/components'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { To, useNavigate } from 'react-router-dom'

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
		<div className="m-0 hidden items-center gap-1 md:flex">
			<IconButton
				// shortcutAction="Go back"
				// shortcutKeybind={['⌘', '[']}
				variant="ghost"
				size="sm"
				onClick={navigateBackward}
				disabled={backwardsUrl === 0}
			>
				<ChevronLeft size="0.75rem" />
			</IconButton>

			<IconButton
				// shortcutAction="Go forward"
				// shortcutKeybind={['⌘', ']']}
				variant="ghost"
				size="sm"
				onClick={navigateForward}
				disabled={forwardsUrl === 0}
			>
				<ChevronRight size="0.75rem" />
			</IconButton>
		</div>
	)
}
