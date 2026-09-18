import { IconButton } from '@stump/components'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { useFileExplorerContext } from './context'

export default function FileExplorerNavigation() {
	const { goBack, goForward, canGoBack, canGoForward } = useFileExplorerContext()

	return (
		<div className="m-0 gap-1 flex shrink-0 items-center">
			<IconButton variant="ghost" size="sm" onClick={goBack} disabled={!canGoBack}>
				<ChevronLeft />
			</IconButton>

			<IconButton variant="ghost" size="sm" onClick={goForward} disabled={!canGoForward}>
				<ChevronRight />
			</IconButton>
		</div>
	)
}
