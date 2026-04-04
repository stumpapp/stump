import { Text } from '@stump/components'
import { useMemo } from 'react'

import { useFileExplorerContext } from './context'
import FileExplorerNavigation from './FileExplorerNavigation'
import LayoutButtons from './LayoutButtons'
import { UploadModal } from './upload'

export const HEADER_HEIGHT = 40

// TODO: sort options, search?
export default function FileExplorerHeader() {
	const { currentPath, uploadConfig } = useFileExplorerContext()

	const basename = useMemo(() => currentPath?.split('/').pop() ?? '', [currentPath])

	return (
		<header className="top-0 h-10 px-4 md:border-y-0 md:border-b sticky z-10 flex w-full justify-between border-y border-edge bg-background">
			<nav className="h-10 gap-4 flex w-full items-center">
				<FileExplorerNavigation />
				<Text size="sm" className="line-clamp-1 text-foreground/80">
					{basename}
				</Text>
			</nav>

			<div className="gap-3 flex shrink-0 items-center">
				<LayoutButtons />
				{uploadConfig?.enabled && <UploadModal />}
			</div>
		</header>
	)
}
