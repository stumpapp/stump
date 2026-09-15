import { useAppStore } from '@stump/browser/stores'
import { Button, IconButton, ToolTip } from '@stump/components'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { ChevronLeft, ChevronRight, Minus, Square, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useMatch, useNavigate } from 'react-router'

const MACOS_TRAFFIC_LIGHT_PADDING = 76

// TODO: i kinda don't love this, i'd rather have a more seamless bar without a border
// but that is more invasive of a change (e.g., each screen would need to have some
// grab point sticky to top). only so much time and so much stump to work all around
// so we'll see when i get to it
// i also kinda don't love the nav buttons, but same as above easier to leave it for now
// and consider more meaningfully later

export default function AppTitleBar() {
	const navigate = useNavigate()
	const platform = useAppStore((store) => store.platform)

	const serverMatch = useMatch('/server/:serverId/*')
	const serverId = serverMatch?.params?.serverId

	const isInServerContext = !!serverId
	const isMacOS = platform === 'macOS'

	const [isFullscreen, setIsFullscreen] = useState(false)

	useEffect(() => {
		const win = getCurrentWindow()

		win.isFullscreen().then(setIsFullscreen)

		const unlisten = win.onResized(() => {
			win.isFullscreen().then(setIsFullscreen)
		})

		return () => {
			unlisten.then((fn) => fn())
		}
	}, [])

	// macos will hide the traffic lights in full screen unless mouse enters title area,
	// and we dont need double bars so just not rendering in that scenario
	if (isMacOS && isFullscreen) {
		return null
	}

	const handleClose = () => getCurrentWindow().close()
	const handleMinimize = () => getCurrentWindow().minimize()
	const handleMaximize = () => getCurrentWindow().toggleMaximize()

	const handleNavigateBack = () => navigate(-1)
	const handleNavigateForward = () => navigate(1)

	return (
		<div
			data-tauri-drag-region
			className="h-8.5 bg-background-surface z-100 flex w-full shrink-0 items-center border-b border-border select-none"
			style={isMacOS ? { paddingLeft: MACOS_TRAFFIC_LIGHT_PADDING } : undefined}
		>
			<div className="gap-0.5 pl-1 flex items-center">
				{isInServerContext && (
					<>
						<ToolTip content="Navigate back" size="xs">
							<Button variant="ghost" size="icon" onClick={handleNavigateBack} className="size-7">
								<ChevronLeft size="0.75rem" />
							</Button>
						</ToolTip>

						<ToolTip content="Navigate forward" size="xs">
							<Button
								variant="ghost"
								size="icon"
								onClick={handleNavigateForward}
								className="size-7"
							>
								<ChevronRight size="0.75rem" />
							</Button>
						</ToolTip>
					</>
				)}
			</div>

			<div data-tauri-drag-region className="flex-1" />

			<div className="px-2 flex items-center">
				{!isMacOS && (
					<div className="ml-2 flex items-center">
						<IconButton variant="ghost" size="sm" title="Minimize" onClick={handleMinimize}>
							<Minus className="h-4 w-4" />
						</IconButton>

						<IconButton variant="ghost" size="sm" title="Maximize" onClick={handleMaximize}>
							<Square className="h-3.5 w-3.5" />
						</IconButton>

						<IconButton
							variant="ghost"
							size="sm"
							title="Close"
							onClick={handleClose}
							className="hover:bg-red-500 hover:text-white"
						>
							<X className="h-4 w-4" />
						</IconButton>
					</div>
				)}
			</div>
		</div>
	)
}
