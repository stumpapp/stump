import { useAppStore } from '@stump/browser/stores'
import { IconButton, ToolTip } from '@stump/components'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { ChevronLeft, ChevronRight, Minus, Settings, Square, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useMatch, useNavigate } from 'react-router-dom'

const MACOS_TRAFFIC_LIGHT_PADDING = 76

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

	const handleSettings = () => {
		if (serverId) {
			navigate(`/server/${serverId}/settings`)
		}
	}

	return (
		<div
			data-tauri-drag-region
			className="h-9 z-100 flex w-full shrink-0 items-center border-b border-edge-subtle bg-background-surface select-none"
			style={isMacOS ? { paddingLeft: MACOS_TRAFFIC_LIGHT_PADDING } : undefined}
		>
			<div className="gap-0.5 pl-1 flex items-center">
				{isInServerContext && (
					<>
						<ToolTip content="Navigate back" size="xs">
							<IconButton variant="ghost" size="sm" onClick={handleNavigateBack}>
								<ChevronLeft size="0.75rem" />
							</IconButton>
						</ToolTip>

						<ToolTip content="Navigate forward" size="xs">
							<IconButton variant="ghost" size="sm" onClick={handleNavigateForward}>
								<ChevronRight size="0.75rem" />
							</IconButton>
						</ToolTip>
					</>
				)}
			</div>

			<div data-tauri-drag-region className="flex-1" />

			<div className="px-2 flex items-center">
				{isInServerContext && (
					<ToolTip content="Server settings" size="xs" side="left">
						<IconButton variant="ghost" size="sm" onClick={handleSettings}>
							<Settings size="0.75rem" />
						</IconButton>
					</ToolTip>
				)}

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
