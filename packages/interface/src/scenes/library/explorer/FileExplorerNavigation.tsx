import { useAppProps } from '@stump/client'
import { IconButton } from '@stump/components'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { useFileExplorerContext } from './context'

export default function FileExplorerNavigation() {
	const { platform } = useAppProps() ?? {}
	const { goBack, goForward, canGoBack, canGoForward } = useFileExplorerContext()

	const isDesktop = platform !== 'browser'

	return (
		<div className="m-0 hidden items-center gap-1 md:flex">
			<IconButton
				variant="ghost"
				size="sm"
				onClick={goBack}
				disabled={!canGoBack}
				pressEffect={isDesktop}
			>
				<ChevronLeft size="0.75rem" />
			</IconButton>

			<IconButton
				variant="ghost"
				size="sm"
				onClick={goForward}
				disabled={!canGoForward}
				pressEffect={isDesktop}
			>
				<ChevronRight size="0.75rem" />
			</IconButton>
		</div>
	)
}
