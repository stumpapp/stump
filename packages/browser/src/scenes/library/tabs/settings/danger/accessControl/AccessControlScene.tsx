import { useOidcConfig } from '@stump/client'

import { useLibraryContext } from '@/scenes/library/context'

import LibraryAccess from './LibraryAccess'
import { LibraryOidcGroups } from './LibraryOidcGroups'

// TODO: add a section which shows the users not allowed to access the library from the tags
// This implies user:read permission

export default function AccessControlScene() {
	const { library } = useLibraryContext()
	const oidcConfig = useOidcConfig()

	// we pretty much always show the oidc controls if enabled or if there are existing oidc groups,
	// the latter so we can remove them
	const showOidcAccessControl = !!library.oidcGroups || !!oidcConfig?.enabled

	const showManualAccessControl =
		// if we don't have oidc groups (effectively) then show manual access control
		!library.oidcGroups ||
		!library.oidcGroups.length ||
		// if oidc is not enabled OR local auth is allowed, then we likely have non-oidc users and
		// therefore need to also show manual access control
		!oidcConfig?.enabled ||
		!oidcConfig.disableLocalAuth

	return (
		<div className="gap-12 flex flex-col">
			{showManualAccessControl && <LibraryAccess />}
			{showOidcAccessControl && <LibraryOidcGroups />}
		</div>
	)
}
