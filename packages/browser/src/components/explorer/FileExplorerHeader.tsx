import { Text } from '@stump/components'
import { useMemo } from 'react'

import { useFileExplorerContext } from './context'
import FileExplorerNavigation from './FileExplorerNavigation'
import LayoutButtons from './LayoutButtons'
import { UploadModal } from './upload'

export const HEADER_HEIGHT = 40

// TODO: sort options, search?
export default function FileExplorerHeader() {
	const { currentPath, uploadEnabled } = useFileExplorerContext()

	const basename = useMemo(() => currentPath?.split('/').pop() ?? '', [currentPath])

	return (
		<header className="sticky top-0 z-10 flex h-10 w-full justify-between border-y border-edge bg-background px-4 md:border-y-0 md:border-b">
			<nav className="flex h-10 w-full items-center gap-4">
				<FileExplorerNavigation />
				<Text size="sm" className="line-clamp-1 text-opacity-80">
					{basename}
				</Text>
			</nav>

			<div className="flex shrink-0 items-center gap-3">
				<LayoutButtons />
				{uploadEnabled && <UploadModal />}
			</div>
		</header>
	)
}
