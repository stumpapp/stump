import { useEmailersQuery } from '@stump/client'
import { ButtonOrLink, Card, Heading } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { CircleSlash2 } from 'lucide-react'
import React from 'react'

import paths from '@/paths'

import { useEmailerSettingsContext } from '../context'
import EmailerListItem from './EmailerListItem'

export default function EmailersList() {
	const { t } = useLocaleContext()
	const { canCreateEmailer } = useEmailerSettingsContext()
	const { emailers } = useEmailersQuery({
		suspense: true,
	})

	if (!emailers?.length) {
		return (
			<Card className="flex min-h-[150px] flex-col items-center justify-center gap-4">
				<CircleSlash2 className="h-10 w-10 pb-2 pt-1 text-foreground-muted" />
				<div className="text-center">
					<Heading size="xs">{t(`${LOCALE_BASE}.emptyHeading`)}</Heading>
					{canCreateEmailer && (
						<ButtonOrLink href={paths.createEmailer()} className="mt-2">
							Create an emailer
						</ButtonOrLink>
					)}
				</div>
			</Card>
		)
	}

	return (
		<div className="flex flex-col space-y-6">
			{emailers.map((emailer) => (
				<EmailerListItem key={emailer.id} emailer={emailer} />
			))}
		</div>
	)
}

const LOCALE_BASE = 'settingsScene.server/email.sections.emailers.list'
