import {
	closestCenter,
	DndContext,
	DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core'
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button, NewCard, RawSwitch, Sheet, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react'
import { FormEvent, useId, useState } from 'react'

import {
	getHomeSectionId,
	HOME_SECTION_IDS,
	HomeSection,
	toHomeSectionInput,
	useHomeArrangement,
	useUpdateHomeArrangement,
} from '@/scenes/home/arrangement'

const BASE = 'settingsScene.app/preferences.sections.homeArrangement'

export default function HomeArrangementPreference() {
	const { t } = useLocaleContext()
	const [open, setOpen] = useState(false)
	const { data } = useHomeArrangement()
	const { mutateAsync, isPending } = useUpdateHomeArrangement()

	return (
		<NewCard label={t(`${BASE}.title`)} description={t(`${BASE}.description`)}>
			<NewCard.Row label={t(`${BASE}.label`)} description={t(`${BASE}.hint`)}>
				<Sheet
					open={open}
					onOpen={() => setOpen(true)}
					onClose={() => {
						if (!isPending) setOpen(false)
					}}
					closeIcon={!isPending}
					title={t(`${BASE}.title`)}
					description={t(`${BASE}.hint`)}
					trigger={
						<Button size="sm" variant="outline">
							{t('common.edit')}
						</Button>
					}
				>
					{open && (
						<HomeArrangementForm
							sections={data.me.preferences.homeArrangement.sections}
							onCancel={() => setOpen(false)}
							onSave={async (sections) => {
								await mutateAsync({ input: { sections: sections.map(toHomeSectionInput) } })
								setOpen(false)
							}}
						/>
					)}
				</Sheet>
			</NewCard.Row>
		</NewCard>
	)
}

type FormProps = {
	sections: HomeSection[]
	onSave: (sections: HomeSection[]) => Promise<unknown>
	onCancel: () => void
}

export function HomeArrangementForm({ sections, onSave, onCancel }: FormProps) {
	const { t } = useLocaleContext()
	const [draft, setDraft] = useState(sections)
	const [saving, setSaving] = useState(false)
	const [failed, setFailed] = useState(false)
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	)
	const ids = draft.map(getHomeSectionId)
	// Keep an unsupported saved configuration intact instead of silently dropping it.
	const supported =
		ids.length === HOME_SECTION_IDS.length &&
		HOME_SECTION_IDS.every((id) => ids.filter((value) => value === id).length === 1)

	const move = (from: number, to: number) => {
		if (saving || from < 0 || to < 0 || from >= draft.length || to >= draft.length) return
		setDraft((current) => arrayMove(current, from, to))
	}
	const onDragEnd = ({ active, over }: DragEndEvent) => {
		if (over && active.id !== over.id)
			move(
				ids.indexOf(active.id as (typeof ids)[number]),
				ids.indexOf(over.id as (typeof ids)[number]),
			)
	}
	const save = async (event: FormEvent) => {
		event.preventDefault()
		if (saving || !supported) return
		setSaving(true)
		setFailed(false)
		try {
			await onSave(draft)
		} catch {
			setFailed(true)
		} finally {
			setSaving(false)
		}
	}
	const reset = () =>
		setDraft(
			HOME_SECTION_IDS.flatMap((id) => {
				const section = draft.find((item) => getHomeSectionId(item) === id)
				return section ? [{ ...section, visible: true }] : []
			}),
		)

	return (
		<form onSubmit={save} className="space-y-4 px-4 pb-4">
			{!supported && <Text role="alert">{t(`${BASE}.unsupported`)}</Text>}
			{supported && (
				<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
					<SortableContext
						items={ids.filter((id) => id !== undefined)}
						strategy={verticalListSortingStrategy}
					>
						<ol aria-label={t(`${BASE}.label`)} className="space-y-2">
							{draft.map((section, index) => (
								<HomeArrangementItem
									key={getHomeSectionId(section)}
									section={section}
									disabled={saving}
									first={index === 0}
									last={index === draft.length - 1}
									onMove={(offset) => move(index, index + offset)}
									onVisibilityChange={(visible) =>
										setDraft((current) =>
											current.map((item, i) => (i === index ? { ...item, visible } : item)),
										)
									}
								/>
							))}
						</ol>
					</SortableContext>
				</DndContext>
			)}
			{failed && <Text role="alert">{t(`${BASE}.saveFailed`)}</Text>}
			<div className="gap-2 flex flex-wrap justify-end">
				<Button variant="ghost" disabled={saving || !supported} onClick={reset}>
					{t(`${BASE}.reset`)}
				</Button>
				<Button variant="outline" disabled={saving} onClick={onCancel}>
					{t('common.cancel')}
				</Button>
				<Button type="submit" disabled={saving || !supported}>
					{t(saving ? `${BASE}.saving` : 'common.save')}
				</Button>
			</div>
		</form>
	)
}

type ItemProps = {
	section: HomeSection
	disabled: boolean
	first: boolean
	last: boolean
	onMove: (offset: number) => void
	onVisibilityChange: (visible: boolean) => void
}

function HomeArrangementItem({
	section,
	disabled,
	first,
	last,
	onMove,
	onVisibilityChange,
}: ItemProps) {
	const { t } = useLocaleContext()
	const id = getHomeSectionId(section)!
	const label = t(`homeScene.${id}.title`)
	const labelId = useId()
	const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id, disabled })
	return (
		<li
			ref={setNodeRef}
			style={{ transform: CSS.Transform.toString(transform), transition }}
			className="gap-2 p-3 flex items-center rounded-lg bg-secondary/80"
		>
			<Button
				{...attributes}
				{...listeners}
				variant="ghost"
				size="icon"
				disabled={disabled}
				aria-label={t(`${BASE}.reorder`, { section: label })}
				className="cursor-grab touch-none"
			>
				<GripVertical aria-hidden="true" />
			</Button>
			<span id={labelId} className="text-sm flex-1">
				{label}
			</span>
			<Button
				variant="ghost"
				size="icon"
				disabled={disabled || first}
				aria-label={t(`${BASE}.moveUp`, { section: label })}
				onClick={() => onMove(-1)}
			>
				<ArrowUp aria-hidden="true" />
			</Button>
			<Button
				variant="ghost"
				size="icon"
				disabled={disabled || last}
				aria-label={t(`${BASE}.moveDown`, { section: label })}
				onClick={() => onMove(1)}
			>
				<ArrowDown aria-hidden="true" />
			</Button>
			<RawSwitch
				checked={section.visible}
				disabled={disabled}
				onCheckedChange={onVisibilityChange}
				aria-labelledby={labelId}
			/>
		</li>
	)
}
