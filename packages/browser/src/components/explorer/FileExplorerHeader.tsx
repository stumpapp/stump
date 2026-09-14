import { useFileExplorerContext } from './context'
import FileExplorerNavigation from './FileExplorerNavigation'
import LayoutButtons from './LayoutButtons'
import { UploadModal } from './upload'

export const HEADER_HEIGHT = 40

export default function FileExplorerHeader() {
	const { uploadConfig } = useFileExplorerContext()

	return (
		<header className="top-0 h-10 px-4 md:border-y-0 md:border-b sticky z-10 flex w-full justify-between border-y border-border bg-background">
			<nav className="h-10 gap-2 flex items-center">
				<FileExplorerNavigation />
			</nav>

			<div className="gap-3 flex shrink-0 items-center">
				<LayoutButtons />
				{uploadConfig?.enabled && <UploadModal />}
			</div>
		</header>
	)
}
