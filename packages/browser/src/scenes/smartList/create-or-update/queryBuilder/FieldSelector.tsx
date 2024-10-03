import { Button, cn, Command, Popover } from '@stump/components'
import { ArrowLeft, ArrowRight, ChevronsUpDown } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFieldArray, useFormContext } from 'react-hook-form'

import { FilterSource, SmartListFormSchema } from '../form/newSchema'

type Props = {
	groupIdx: number
	idx: number
}

type FieldDef = SmartListFormSchema['filters']['groups'][number]['filters'][number]

export function FieldSelector({ groupIdx, idx }: Props) {
	const [open, setOpen] = useState(false)

	const [source, setSource] = useState<FilterSource | null>(null)

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
						Book
						<ArrowRight className="ml-2 h-4 w-4 text-foreground-muted" />
					</Command.Item>
					<Command.Item
						onSelect={() => setSource('book_meta')}
						className="flex items-center justify-between"
					>
						Book Meta
						<ArrowRight className="ml-2 h-4 w-4 text-foreground-muted" />
					</Command.Item>
					<Command.Item
						onSelect={() => setSource('series')}
						className="flex items-center justify-between"
					>
						Series
						<ArrowRight className="ml-2 h-4 w-4 text-foreground-muted" />
					</Command.Item>
					<Command.Item
						onSelect={() => setSource('library')}
						className="flex items-center justify-between"
					>
						Library
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
								// Note: For some reason, this transforms the `value` to lowercase...
								onSelect={() => {
									updateField({ field: option.value, source })
									setOpen(false)
								}}
								className={cn('transition-all duration-75', { 'text-brand': false })}
								value={option.value}
							>
								{option.label}
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
					className="flex h-8 w-full items-center space-x-2 text-sm"
					onClick={() => setSource(null)}
				>
					<ArrowLeft className="ml-2 h-4 w-4 text-foreground-muted" />
					<span className="text-foreground-muted">Back</span>
				</button>
			)
		} else {
			return <span className="text-foreground-muted">Source</span>
		}
	}

	const renderSelected = () => {
		if (fieldDef?.field) {
			return fieldDef.field
		} else {
			return <span className="text-foreground-muted">Attribute</span>
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
							'[&_[cmdk-group-heading]]:px-0 [&_[cmdk-group-heading]]:pb-0': !!source,
						})}
					>
						{renderSource()}
					</Command.Group>
				</Command>
			</Popover.Content>
		</Popover>
	)
}

const sourceOptions: Record<FilterSource, { label: string; value: string }[]> = {
	book: [
		{ label: 'Filename', value: 'name' },
		{ label: 'Size', value: 'size' },
		{ label: 'Extension', value: 'extension' },
		{ label: 'Created At', value: 'created_at' },
		{ label: 'Updated At', value: 'updated_at' },
		{ label: 'Status', value: 'status' },
		{ label: 'Path', value: 'path' },
		{ label: 'Pages', value: 'pages' },
	],
	book_meta: [],
	library: [],
	series: [],
}
