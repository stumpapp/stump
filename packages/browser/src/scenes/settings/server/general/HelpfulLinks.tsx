import { cn, Heading, Link, Text, TEXT_VARIANTS } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { ExternalLink } from 'lucide-react'

export default function HelpfulLinks() {
	const { t } = useLocaleContext()

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Heading size="sm">{t('settingsScene.server/general.sections.helpfulLinks.title')}</Heading>
				<Text size="sm" variant="muted" className="mt-1">
					{t('settingsScene.server/general.sections.helpfulLinks.description')}
				</Text>
			</div>

			<div className="flex flex-row flex-wrap gap-12 md:gap-8">
				<Link
					href="https://www.stumpapp.dev/guides"
					target="__blank"
					rel="noopener noreferrer"
					className={cn('flex items-center space-x-2 text-sm hover:underline', TEXT_VARIANTS.label)}
					underline={false}
				>
					<span>{t('settingsScene.server/general.sections.helpfulLinks.links.documentation')}</span>
					<ExternalLink className="h-3 w-3 text-foreground-muted" />
				</Link>

				<Link
					href="https://github.com/stumpapp/stump"
					target="__blank"
					rel="noopener noreferrer"
					className={cn('flex items-center space-x-2 text-sm hover:underline', TEXT_VARIANTS.label)}
					underline={false}
				>
					<span>GitHub</span>
					<ExternalLink className="h-3 w-3 text-foreground-muted" />
				</Link>

				<Link
					href="https://github.com/stumpapp/stump/blob/main/.github/CHANGELOG.md"
					target="__blank"
					rel="noopener noreferrer"
					className={cn('flex items-center space-x-2 text-sm hover:underline', TEXT_VARIANTS.label)}
					underline={false}
				>
					<span>{t('settingsScene.server/general.sections.helpfulLinks.links.changelog')}</span>
					<ExternalLink className="h-3 w-3 text-foreground-muted" />
				</Link>
			</div>
		</div>
	)
}
