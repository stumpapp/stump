import { ButtonOrLink, NewCard } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { ExternalLink } from 'lucide-react'

import { ChangelogDialog } from './ChangelogDialog'

export default function HelpfulLinks() {
	const { t } = useLocaleContext()

	return (
		<NewCard label={t('settingsScene.server/general.sections.helpfulLinks.title')}>
			<ChangelogDialog />

			<NewCard.Row
				label={t('settingsScene.server/general.sections.helpfulLinks.links.documentation')}
			>
				<ButtonOrLink
					href="https://www.stumpapp.dev/guides"
					target="__blank"
					rel="noopener noreferrer"
					size="sm"
					variant="outline"
				>
					{t('common.open')}
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
					{t('common.open')}
					<ExternalLink className="ml-1 h-3 w-3 text-muted-foreground" />
				</ButtonOrLink>
			</NewCard.Row>
		</NewCard>
	)
}
