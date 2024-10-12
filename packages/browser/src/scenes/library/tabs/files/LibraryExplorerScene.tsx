import { Button } from '@stump/components'
import { useRef } from 'react'

import { FileExplorer } from '@/components/explorer'

import { useLibraryContext } from '../../context'

export default function LibraryExplorerScene() {
	const {
		library: { path },
	} = useLibraryContext()

	const fileInputRef = useRef(null)

	// TODO - Remove this test code
	// ////////////////////////////
	const onUploadClicked = () => {
		// eslint-disable-next-line no-console
		console.log(`Selected file: ${fileInputRef}`)
	}

	const onFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (!event.target.files) {
			return
		}

		const file = event.target.files[0]
		if (file) {
			// Handle file here
		}
	}

	return (
		<div className="flex flex-1">
			<Button onClick={onUploadClicked}>Upload</Button>
			<input type="file" ref={fileInputRef} onChange={onFileSelected} title="Browse" />
			<FileExplorer rootPath={path} />
		</div>
	)
}
