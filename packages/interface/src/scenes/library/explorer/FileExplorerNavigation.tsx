import { IconButton } from '@stump/components'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { useFileExplorerContext } from './context'

export default function FileExplorerNavigation() {
	const { goBack, goForward, canGoForward } = useFileExplorerContext()

	return (
		<div className="m-0 hidden items-center gap-1 md:flex">
			<IconButton variant="ghost" size="sm" onClick={goBack}>
				<ChevronLeft size="0.75rem" />
			</IconButton>

			<IconButton variant="ghost" size="sm" onClick={goForward} disabled={!canGoForward}>
				<ChevronRight size="0.75rem" />
			</IconButton>
		</div>
	)
}
