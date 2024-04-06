import React, { Suspense, useMemo } from 'react'

import { useAppContext } from '@/context'

export default function EmailBookDropdownContainer() {
	const { checkPermission } = useAppContext()

	const canSendEmail = useMemo(() => checkPermission('email:send'), [checkPermission])
	const canArbitrarySendEmail = useMemo(
		() => checkPermission('email:arbitrary_send'),
		[checkPermission],
	)

	if (!canSendEmail && !canArbitrarySendEmail) {
		return null
	}

	return (
		<Suspense fallback={null}>
			<EmailBookDropdown canArbitrarySendEmail={canArbitrarySendEmail} />
		</Suspense>
	)
}

type Props = {
	canArbitrarySendEmail: boolean
}

function EmailBookDropdown({ canArbitrarySendEmail }: Props) {
	return <div>TODO</div>
}
