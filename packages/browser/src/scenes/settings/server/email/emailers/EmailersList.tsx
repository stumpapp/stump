import { useEmailersQuery } from '@stump/client'
import { ButtonOrLink, Card, Heading } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { CircleSlash2 } from 'lucide-react'
import React from 'react'

import { useAppContext } from '@/context'
import paths from '@/paths'

export default function EmailersList() {
	const { t } = useLocaleContext()
	const { checkPermission } = useAppContext()
	const { emailers } = useEmailersQuery({
		suspense: true,
	})

	const canCreate = checkPermission('emailer:create')

	if (!emailers?.length) {
		return (
			<Card className="flex min-h-[150px] flex-col items-center justify-center gap-4">
				<CircleSlash2 className="h-10 w-10 pb-2 pt-1 text-muted" />
				<div className="text-center">
					<Heading size="xs">{t(`${LOCALE_BASE}.emptyHeading`)}</Heading>
					{canCreate && (
						<ButtonOrLink href={paths.createEmailer()} className="mt-2">
							Create an emailer
						</ButtonOrLink>
					)}
				</div>
			</Card>
		)
	}

	return <div></div>
}

const LOCALE_BASE = 'settingsScene.server/email.sections.emailers.list'
