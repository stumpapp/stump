import { useSDK } from '@stump/client'
import { Button } from '@stump/components'
import { useRef, useState } from 'react'
import toast from 'react-hot-toast'

import { FileExplorer } from '@/components/explorer'

import { useLibraryContext } from '../../context'

export default function LibraryExplorerScene() {
	const { library } = useLibraryContext()
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const { sdk } = useSDK()

	const fileInputRef = useRef(null)

	// TODO - Remove this test code
	// ////////////////////////////
	const onUploadClicked = async () => {
		// eslint-disable-next-line no-console
		console.log(`Selected file: ${fileInputRef}`)

		if (!selectedFile) {
			return
		}

		try {
			await sdk.upload.uploadLibraryFile(library.id, selectedFile)
			toast.success('Successfully uploaded file')
		} catch (error) {
			console.error(error)
			toast.error('Failed to upload file')
		}
	}

	const onFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = event.target.files
		if (!files || files.length === 0) {
			toast.error('No file selected')
			return
		}

		if (files[0]) {
			setSelectedFile(files[0])
		}
	}

	return (
		<div className="flex flex-1">
			<Button onClick={onUploadClicked}>Upload</Button>
			<input type="file" ref={fileInputRef} onChange={onFileSelected} title="Browse" />
			<FileExplorer rootPath={library.path} displayUpload={true} />
		</div>
	)
}
