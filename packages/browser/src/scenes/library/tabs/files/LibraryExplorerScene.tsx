import { useQuery, useSDK } from '@stump/client'

import { FileExplorer } from '@/components/explorer'

import { useLibraryContext } from '../../context'

export default function LibraryExplorerScene() {
	const { library } = useLibraryContext()
	const { sdk } = useSDK()
	const { data: uploadConfig } = useQuery([sdk.upload.keys.config], () => sdk.upload.config(), {
		suspense: true,
	})

	return (
		<div className="flex flex-1">
			<FileExplorer rootPath={library.path} uploadConfig={uploadConfig} />
		</div>
	)
}
