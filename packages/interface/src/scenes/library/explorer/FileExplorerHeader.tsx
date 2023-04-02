import React from 'react'

import FileExplorerNavigation from './FileExplorerNavigation'

export default function FileExplorerHeader() {
	return (
		<header className="h-12 w-full">
			<nav className="h-full w-full">
				<div className="flex items-center justify-between">
					<FileExplorerNavigation />
				</div>
			</nav>
		</header>
	)
}
