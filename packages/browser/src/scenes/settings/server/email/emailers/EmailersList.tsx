import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { ButtonOrLink, Card, Heading } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { CircleSlash2 } from 'lucide-react'

import paths from '@/paths'

import { useEmailerSettingsContext } from '../context'
import EmailerListItem from './EmailerListItem'

const query = graphql(`
	query EmailersList {
		emailers {
			id
			...EmailerListItem
		}
	}
`)

export default function EmailersList() {
	const { t } = useLocaleContext()
	const { sdk } = useSDK()
	const { canCreateEmailer } = useEmailerSettingsContext()

	const {
		data: { emailers },
	} = useSuspenseGraphQL(query, sdk.cacheKey('emailers'))

	if (!emailers.length) {
		return (
			<Card className="gap-4 flex min-h-[150px] flex-col items-center justify-center">
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
		<div className="space-y-6 flex flex-col">
			{emailers.map((emailer) => (
				<EmailerListItem key={emailer.id} fragment={emailer} />
			))}
		</div>
	)
}

const LOCALE_BASE = 'settingsScene.server/email.sections.emailers.list'
