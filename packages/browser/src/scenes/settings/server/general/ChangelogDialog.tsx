import { useStumpVersion } from '@stump/client'
import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	ButtonOrLink,
	Dialog,
	NewCard,
} from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, ExternalLink } from 'lucide-react'
import { memo, useState } from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
import { Virtuoso } from 'react-virtuoso'

import MarkdownPreview from '../../../../components/markdown/MarkdownPreview'

const CHANGELOG_RAW_URL =
	'https://raw.githubusercontent.com/stumpapp/stump/main/.github/CHANGELOG.md'
const GITHUB_CHANGELOG_URL = 'https://github.com/stumpapp/stump/blob/main/.github/CHANGELOG.md'

const MAX_VERSIONS = 10

// TODO: maybe highlight if behind instead of cutting off starting there?
// that feels more helpful, but no time today so leaving

function parseChangelog(content: string, semver?: string) {
	// strip html so we just work with markdown
	const cleaned = content.replace(/<a[^>]*><\/a>\n?/g, '')
	const all = cleaned.split(/(?=^## \d+\.\d+\.\d+)/m).filter(Boolean)

	const startIdx =
		semver && semver !== '0.0.0'
			? Math.max(
					0,
					all.findIndex((s) => s.startsWith(`## ${semver}`)),
				)
			: 0

	return all.slice(startIdx, startIdx + MAX_VERSIONS + 1).reduce(
		(acc, block) => {
			const match = block.match(/^## (\d+\.\d+\.\d+(?:\s*\([^)]+\))?)/)
			// ^ match version + date
			if (match?.[1]) {
				const body = block.replace(/^## \d+\.\d+\.\d+(?:\s*\([^)]+\))?/, '').trim()
				// ^ remove version header from body + date
				acc[match[1]] = body.split(/(?=^### )/m).filter(Boolean) // split into subsections by "###" headers
			}
			return acc
		},
		{} as Record<string, string[]>,
	)
}

type SectionProps = { version: string; subsections: string[] }

const ChangelogSection = memo(({ version, subsections }: SectionProps) => (
	<NewCard label={version} className="p-4 mb-6 sm:mx-6 first:mt-4">
		{subsections.map((sub, i) => (
			<NewCard.Row key={i}>
				<MarkdownPreview>{sub}</MarkdownPreview>
			</NewCard.Row>
		))}
	</NewCard>
))
ChangelogSection.displayName = 'ChangelogSection'

const SeeMoreFooter = () => {
	const { t } = useLocaleContext()
	return (
		<div className="pb-6 flex items-center justify-center">
			<ButtonOrLink
				href={GITHUB_CHANGELOG_URL}
				target="_blank"
				rel="noopener noreferrer"
				variant="outline"
				size="sm"
			>
				{t('common.seeMore')}

				<ExternalLink className="ml-1 h-3 w-3 text-muted-foreground" />
			</ButtonOrLink>
		</div>
	)
}

export function ChangelogDialog() {
	const [open, setOpen] = useState(false)

	const version = useStumpVersion()
	const semver = version?.semver

	const { t } = useLocaleContext()
	const { data: raw, error: fetchError } = useQuery({
		enabled: open && !!semver,
		gcTime: Infinity,
		queryFn: async () => {
			const response = await fetch(CHANGELOG_RAW_URL)
			if (!response.ok) throw new Error(`The request failed with status ${response.status}`)
			return response.text()
		},
		queryKey: ['changelog', semver],
		// ^ the idea here being combined with stale/gcTime we only really refetch if semver changes
		staleTime: Infinity,
	})

	const sections = raw ? parseChangelog(raw, semver) : {}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<NewCard.Row label={t(getKey('label'))} description={t(getKey('description'))}>
				<Dialog.Trigger asChild>
					<Button variant="outline" size="sm">
						{t('common.view')}
					</Button>
				</Dialog.Trigger>
			</NewCard.Row>

			<Dialog.Content size="lg" className="p-0 sm:h-[80vh] h-[95vh] overflow-hidden">
				{fetchError && (
					<Alert>
						<AlertCircle />
						<AlertTitle>{t(getKey('fetchFailed'))}</AlertTitle>
						<AlertDescription>{fetchError.message}</AlertDescription>
					</Alert>
				)}

				{!fetchError && !!raw && (
					<AutoSizer>
						{({ height, width }) => (
							<Virtuoso
								data={Object.entries(sections)}
								itemContent={(_, [version, subsections]) => (
									<ChangelogSection version={version} subsections={subsections} />
								)}
								components={{ Footer: SeeMoreFooter }}
								overscan={200}
								style={{ height, width }}
							/>
						)}
					</AutoSizer>
				)}
			</Dialog.Content>
		</Dialog>
	)
}

const getKey = (key: string) => `settingsScene.server/general.sections.changelog.${key}`
