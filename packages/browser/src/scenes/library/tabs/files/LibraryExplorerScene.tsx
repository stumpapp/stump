import { noop } from 'lodash'

import { FileExplorer } from '@/components/explorer'

import { useLibraryContext } from '../../context'

export default function LibraryExplorerScene() {
	const { library } = useLibraryContext()

	// TODO(upload): Remove this test code
	// const [selectedFile, setSelectedFile] = useState<File | null>(null)
	// const { sdk } = useSDK()

	// const fileInputRef = useRef(null)

	// ////////////////////////////
	// const onUploadClicked = async () => {
	// 	// eslint-disable-next-line no-console
	// 	console.log(`Selected file: ${fileInputRef}`)

	// 	if (!selectedFile) {
	// 		return
	// 	}

	// 	try {
	// 		await sdk.upload.uploadLibraryFile(library.id, selectedFile)
	// 		toast.success('Successfully uploaded file')
	// 	} catch (error) {
	// 		console.error(error)
	// 		toast.error('Failed to upload file')
	// 	}
	// }

	// TODO(upload): Remove this test code
	// const onFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
	// 	const files = event.target.files
	// 	if (!files || files.length === 0) {
	// 		toast.error('No file selected')
	// 		return
	// 	}

	// 	if (files[0]) {
	// 		setSelectedFile(files[0])
	// 	}
	// }

	return (
		<div className="flex flex-1">
			<FileExplorer rootPath={library.path} onUpload={noop} />
		</div>
	)
}
