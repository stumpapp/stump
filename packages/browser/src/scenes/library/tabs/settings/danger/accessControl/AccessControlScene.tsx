import { useOidcConfig } from '@stump/client'

import { useLibraryContext } from '@/scenes/library/context'

import LibraryAccess from './LibraryAccess'
import { LibraryOidcGroups } from './LibraryOidcGroups'

// TODO: add a section which shows the users not allowed to access the library from the tags
// This implies user:read permission

export default function AccessControlScene() {
	const { library } = useLibraryContext()
	const oidcConfig = useOidcConfig()

	const showOidcAccessControl = !!library.oidcGroups || !!oidcConfig?.enabled
	const showManualAccessControl = !library.oidcGroups || !library.oidcGroups.length

	// so if we have oidc groups we don't need to show manual access control that makes sense.
	// if we don't have groups (or are empty) then we should show manual access control regardless
	// of oidc enablement? that feels right, but also feels like i am missing something. the implicit
	// on/off derived from oidc groups made sense when considering backend, but less so for frontend wiring
	return (
		<div className="gap-12 flex flex-col">
			{showManualAccessControl && <LibraryAccess />}
			{showOidcAccessControl && <LibraryOidcGroups />}
		</div>
	)
}
