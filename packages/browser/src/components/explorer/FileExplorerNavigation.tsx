import { IconButton } from '@stump/components'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { useAppStore } from '@/stores'

import { useFileExplorerContext } from './context'

export default function FileExplorerNavigation() {
	const platform = useAppStore((store) => store.platform)

	const { goBack, goForward, canGoBack, canGoForward } = useFileExplorerContext()

	const isDesktop = platform !== 'browser'

	return (
		<div className="m-0 flex shrink-0 items-center gap-1">
			<IconButton
				variant="ghost"
				size="xs"
				onClick={goBack}
				disabled={!canGoBack}
				pressEffect={isDesktop}
			>
				<ChevronLeft size="0.75rem" />
			</IconButton>

			<IconButton
				variant="ghost"
				size="xs"
				onClick={goForward}
				disabled={!canGoForward}
				pressEffect={isDesktop}
			>
				<ChevronRight size="0.75rem" />
			</IconButton>
		</div>
	)
}
