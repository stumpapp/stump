import { Badge, Button, Card, Text, ToolTip } from '@stump/components'
import { FragmentType, graphql, ScheduledJobKind, useFragment } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { BadgeCheck, BadgeX, Cog, Trash2 } from 'lucide-react'
import { useMemo } from 'react'

import { KIND_OPTIONS, LibraryOption, parseScheduledJobConfig } from './utils'

export const scheduledJobRowFragment = graphql(`
	fragment ScheduledJobRow on ScheduledJob {
		id
		name
		kind
		schedule
		config
		enabled
		createdAt
		lastRunAt
	}
`)

type Props = {
	job: FragmentType<typeof scheduledJobRowFragment>
	libraries: LibraryOption[]
	onEdit: () => void
	onDelete: () => void
}

export function ScheduledJobRow({ job, libraries, onEdit, onDelete }: Props) {
	const { t } = useLocaleContext()
	const data = useFragment(scheduledJobRowFragment, job)

	const configSummary = useMemo(() => {
		const config = parseScheduledJobConfig(data.config)
		if (!config) return ''

		if ('libraryIds' in config) {
			const ids = config.libraryIds
			if (ids.length === 0) return t(`${LOCALE_BASE}.row.allLibraries`)
			return ids.map((id) => libraries.find((l) => l.id === id)?.name ?? id).join(', ')
		} else if ('statuses' in config) {
			const statuses = config.statuses
			return statuses.length > 0
				? statuses.map((s) => s.replace(/_/g, ' ').toLowerCase()).join(', ')
				: t(`${LOCALE_BASE}.row.rateLimited`)
		}
		return ''
	}, [data, libraries, t])

	return (
		<Card className="group/scheduled-job gap-4 p-4 flex items-center justify-between">
			<div className="min-w-0 gap-2 flex flex-col">
				<div className="gap-2 flex items-center">
					<Text size="sm" className="font-medium">
						{data.name}
					</Text>

					<Badge size="sm" className="mr-2">
						{kindLabel(data.kind, t)}
					</Badge>

					{data.enabled && (
						<ToolTip content={t(getKey('row.enabled'))} align="end" size="xs">
							<div className="h-7 w-7 flex items-center justify-center rounded-full border border-fill-success/10 bg-fill-success-secondary">
								<BadgeCheck className="text-primary h-4 w-4" strokeWidth={1} />
							</div>
						</ToolTip>
					)}

					{!data.enabled && (
						<ToolTip content={t(getKey('row.disabled'))} align="end" size="xs">
							<div className="h-7 w-7 flex items-center justify-center rounded-full border border-fill-info/10 bg-fill-info-secondary">
								<BadgeX className="text-primary h-4 w-4" strokeWidth={1} />
							</div>
						</ToolTip>
					)}
				</div>

				<Text size="xs" variant="muted" className="font-mono">
					{data.schedule}
				</Text>

				{configSummary && (
					<Text size="xs" variant="muted">
						{configSummary}
					</Text>
				)}

				{data.lastRunAt && (
					<Text size="xs" variant="muted">
						{t(getKey('row.lastRun')).replace(
							'{{date}}',
							new Date(data.lastRunAt).toLocaleString(),
						)}
					</Text>
				)}
			</div>

			<div className="gap-1 flex flex-shrink-0 items-center">
				<ToolTip content={t(getKey('row.delete'))} align="end" size="xs">
					<Button
						onClick={onDelete}
						size="icon"
						className="hover h-7 w-7 p-0 rounded-full border border-edge border-fill-danger/10 bg-fill-danger-secondary hover:bg-fill-danger-hover/20"
					>
						<Trash2 className="text-primary h-4 w-4" strokeWidth={1} />
					</Button>
				</ToolTip>

				<ToolTip content={t(getKey('row.edit'))} align="end" size="xs">
					<Button
						onClick={onEdit}
						size="icon"
						className="h-7 w-7 p-0 rounded-full border border-edge bg-background-surface"
					>
						<Cog className="text-primary h-4 w-4" strokeWidth={1} />
					</Button>
				</ToolTip>
			</div>
		</Card>
	)
}

const LOCALE_BASE = 'settingsScene.server/jobs.sections.scheduling'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`

const kindLabel = (kind: ScheduledJobKind, t: (key: string) => string) => {
	const option = KIND_OPTIONS.find((o) => o.value === kind)
	return option ? t(getKey(`fields.kind.${option.localeKey}`)) : kind
}
