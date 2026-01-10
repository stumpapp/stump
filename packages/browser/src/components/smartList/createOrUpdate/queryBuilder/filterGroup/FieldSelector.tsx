import { Button, cn, Command, Popover } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { ArrowLeft, ArrowRight, ChevronsUpDown } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFieldArray, useFormContext } from 'react-hook-form'

import { FilterSource, SmartListFormSchema } from '../../schema'
import { useFilterGroupContext } from './context'

type Props = {
	idx: number
}

type FieldDef = SmartListFormSchema['filters']['groups'][number]['filters'][number]

export function FieldSelector({ idx }: Props) {
	const [open, setOpen] = useState(false)

	const [source, setSource] = useState<FilterSource | null>(null)

	const { t } = useLocaleContext()
	const { groupIdx } = useFilterGroupContext()

	const form = useFormContext<SmartListFormSchema>()
	const { fields, update } = useFieldArray({
		control: form.control,
		name: `filters.groups.${groupIdx}.filters`,
	})

	const fieldDef = useMemo(() => fields?.[idx], [fields, idx])

	useEffect(() => {
		if (fieldDef) {
			setSource(fieldDef.source)
		}
	}, [fieldDef, open])

	const updateField = useCallback(
		(params: Partial<FieldDef>) => {
			const newField = { ...fieldDef, ...params }
			update(idx, newField as FieldDef)
		},
		[update, fieldDef, idx],
	)

	const renderSource = () => {
		if (!source) {
			return (
				<>
					<Command.Item
						onSelect={() => setSource('book')}
						className="flex items-center justify-between"
					>
						{t(getSourceKey('book', 'label'))}
						<ArrowRight className="ml-2 h-4 w-4 text-foreground-muted" />
					</Command.Item>
					<Command.Item
						onSelect={() => setSource('book_meta')}
						className="flex items-center justify-between"
					>
						{t(getSourceKey('book_meta', 'label'))}
						<ArrowRight className="ml-2 h-4 w-4 text-foreground-muted" />
					</Command.Item>
					<Command.Item
						onSelect={() => setSource('series')}
						className="flex items-center justify-between"
					>
						{t(getSourceKey('series', 'label'))}
						<ArrowRight className="ml-2 h-4 w-4 text-foreground-muted" />
					</Command.Item>

					<Command.Item
						onSelect={() => setSource('series_meta')}
						className="flex items-center justify-between"
					>
						{t(getSourceKey('series_meta', 'label'))}
						<ArrowRight className="ml-2 h-4 w-4 text-foreground-muted" />
					</Command.Item>

					<Command.Item
						onSelect={() => setSource('library')}
						className="flex items-center justify-between"
					>
						{t(getSourceKey('library', 'label'))}
						<ArrowRight className="ml-2 h-4 w-4 text-foreground-muted" />
					</Command.Item>
				</>
			)
		} else {
			const options = sourceOptions[source] || []
			return (
				<div>
					{options.map((option) => {
						return (
							<Command.Item
								key={option.value}
								onSelect={() => {
									updateField({ field: option.value, source })
									setOpen(false)
								}}
								className={cn('transition-all duration-75', { 'text-brand': false })}
								value={option.value}
							>
								{t(getAttributeKey(source, option.value))}
							</Command.Item>
						)
					})}
				</div>
			)
		}
	}

	const renderGroupHeader = () => {
		if (source) {
			return (
				<button
					className="flex w-full items-center space-x-2 text-sm"
					onClick={() => setSource(null)}
				>
					<ArrowLeft className="ml-2 h-4 w-4 text-foreground-muted" />
					<span className="text-foreground-muted">{t(getKey('source.back'))}</span>
				</button>
			)
		} else {
			return <span className="text-foreground-muted">{t(getKey('source.label'))}</span>
		}
	}

	const renderSelected = () => {
		if (fieldDef?.field) {
			// return fieldDef.field
			return source
				? // ? `${t(getSourceKey(source, 'label'))}.${t(getAttributeKey(source, fieldDef.field))}`
					`${source}.${fieldDef.field}`
				: fieldDef.field
		} else {
			return <span className="text-foreground-muted">{t(getKey('placeholder'))}</span>
		}
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<Popover.Trigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className="h-[unset] justify-between truncate border-edge-subtle text-foreground-subtle outline-none hover:bg-background-surface data-[state=open]:bg-transparent data-[state=open]:ring-2 data-[state=open]:ring-edge-brand data-[state=open]:ring-offset-2 data-[state=open]:ring-offset-background"
				>
					{renderSelected()}
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</Popover.Trigger>
			<Popover.Content className="mt-1 max-h-96 w-52 overflow-y-auto p-0" align="start">
				<Command>
					<Command.Group
						heading={renderGroupHeader()}
						className={cn({
							'[&_[cmdk-group-heading]]:px-0': !!source,
						})}
					>
						{renderSource()}
					</Command.Group>
				</Command>
			</Popover.Content>
		</Popover>
	)
}

const sourceOptions: Record<FilterSource, { value: string }[]> = {
	book: [
		{ value: 'name' },
		{ value: 'size' },
		{ value: 'extension' },
		{ value: 'createdAt' },
		{ value: 'updatedAt' },
		{ value: 'status' },
		{ value: 'path' },
		{ value: 'pages' },
		{ value: 'tags' },
	],
	book_meta: [
		{ value: 'title' },
		{ value: 'summary' },
		{ value: 'notes' },
		{ value: 'genres' },
		{ value: 'writers' },
		{ value: 'pencillers' },
		{ value: 'inkers' },
		{ value: 'colorists' },
		{ value: 'letterers' },
		{ value: 'editors' },
		{ value: 'publisher' },
		{ value: 'coverArtists' },
		{ value: 'links' },
		{ value: 'characters' },
		{ value: 'teams' },
	],
	library: [{ value: 'name' }, { value: 'path' }],
	series: [{ value: 'name' }, { value: 'path' }],
	series_meta: [
		{ value: 'ageRating' },
		{ value: 'metaType' },
		{ value: 'title' },
		{ value: 'summary' },
		{ value: 'publisher' },
		{ value: 'imprint' },
		{ value: 'comicid' },
		{ value: 'booktype' },
		{ value: 'status' },
		{ value: 'volume' },
	],
}

// TODO: series_meta: [meta_type, publisher, status, age_rating, volume]

const LOCALE_KEY = 'createOrUpdateSmartListForm.fields.queryBuilder.filters.fieldSelect'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
const getSourceKey = (source: FilterSource, key: string) => `${LOCALE_KEY}.source.${source}.${key}`
const getAttributeKey = (source: FilterSource, key: string) =>
	getSourceKey(source, `attributes.${key}`)
