import LibraryExclusions from './LibraryExclusions'

// TODO: add a section which shows the users not allowed to access the library from the tags
// This implies user:read permission

export default function AccessControlScene() {
	return (
		<div className="flex flex-col gap-12">
			<LibraryExclusions />
		</div>
	)
}
