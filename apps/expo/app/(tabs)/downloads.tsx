import Unimplemented from '~/components/Unimplemented'
import { useDownloadStore } from '~/stores'

export default function Screen() {
	const files = useDownloadStore((state) => state.files)

	console.log(files)

	return <Unimplemented message="Downloads are not yet implemented" />
}
