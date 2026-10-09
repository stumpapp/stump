import { ButtonOrLink, NewCard } from '@stump/components'
import { ExternalLink } from 'lucide-react'

import { useTranslate } from '@/hooks/useTranslate'

import { ChangelogDialog } from './ChangelogDialog'

export default function HelpfulLinks() {
	const { t, translate } = useTranslate()

	return (
		<NewCard label={t('settingsScene.server/general.sections.helpfulLinks.title')}>
			<ChangelogDialog />

			<NewCard.Row
				label={t('settingsScene.server/general.sections.helpfulLinks.links.documentation')}
			>
				<ButtonOrLink
					href="https://www.stumpapp.dev/docs"
					target="__blank"
					rel="noopener noreferrer"
					size="sm"
					variant="outline"
				>
					{translate('shared.common.open')}
					<ExternalLink className="ml-1 h-3 w-3 text-muted-foreground" />
				</ButtonOrLink>
			</NewCard.Row>

			<NewCard.Row label="GitHub">
				<ButtonOrLink
					href="https://github.com/stumpapp/stump"
					target="__blank"
					rel="noopener noreferrer"
					size="sm"
					variant="outline"
				>
					{translate('shared.common.open')}
					<ExternalLink className="ml-1 h-3 w-3 text-muted-foreground" />
				</ButtonOrLink>
			</NewCard.Row>
		</NewCard>
	)
}
