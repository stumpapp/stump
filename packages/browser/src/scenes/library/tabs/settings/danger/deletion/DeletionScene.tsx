import CleanLibrary from './CleanLibrary'
import DeleteLibrary from './DeleteLibrary'

export default function DeletionScene() {
	return (
		<div className="gap-12 flex flex-col">
			<CleanLibrary />
			<DeleteLibrary />
		</div>
	)
}
