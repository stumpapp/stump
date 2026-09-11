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
import { Button, cn, IconButton, NewCard, Sheet, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Eye, EyeOff } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { toast } from 'sonner'

import {
	defaultHomeSections,
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
						<Button size="sm" variant="ghost">
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
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	)
	const ids = draft.map(getHomeSectionId)
	// The server normalizes configurations; Reset also recovers stale client data.
	const supported =
		ids.length === HOME_SECTION_IDS.length &&
		HOME_SECTION_IDS.every((id) => ids.filter((value) => value === id).length === 1)

	useEffect(() => {
		const id = 'home-arrangement-configuration'
		if (!supported) {
			toast.error(t(`${BASE}.unsupported`), {
				id,
				description: t(`${BASE}.unsupportedDescription`),
			})
		}
		return () => {
			toast.dismiss(id)
		}
	}, [supported, t])

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
		try {
			await onSave(draft)
		} catch (error) {
			toast.error(t(`${BASE}.saveFailed`), {
				description: error instanceof Error ? error.message : undefined,
			})
		} finally {
			setSaving(false)
		}
	}
	const reset = () => setDraft(defaultHomeSections())

	return (
		<form onSubmit={save} className="px-4 pb-4">
			<div className="flex w-full flex-col overflow-hidden rounded-xl border border-border">
				<header className="px-4 py-0.5 flex items-center justify-between bg-muted/50">
					<Button size="sm" variant="ghost" disabled={saving} onClick={reset}>
						{t(`${BASE}.reset`)}
					</Button>
					<div className="gap-1 flex items-center">
						<Button size="sm" variant="ghost" disabled={saving} onClick={onCancel}>
							{t('common.cancel')}
						</Button>
						<Button
							size="sm"
							variant="ghost"
							type="submit"
							disabled={saving || !supported}
							aria-busy={saving}
						>
							{t('common.save')}
						</Button>
					</div>
				</header>
				{supported ? (
					<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
						<SortableContext
							items={ids.filter((id) => id !== undefined)}
							strategy={verticalListSortingStrategy}
						>
							<ol
								aria-label={t(`${BASE}.label`)}
								className="gap-2 px-4 py-3.5 flex w-full flex-col"
							>
								{draft.map((section, index) => (
									<HomeArrangementItem
										key={getHomeSectionId(section)}
										section={section}
										disabled={saving}
										onVisibilityChange={() =>
											setDraft((current) =>
												current.map((item, i) =>
													i === index ? { ...item, visible: !item.visible } : item,
												),
											)
										}
									/>
								))}
							</ol>
						</SortableContext>
					</DndContext>
				) : (
					<Text className="px-4 py-3.5" variant="muted">
						{t(`${BASE}.unsupportedDescription`)}
					</Text>
				)}
			</div>
		</form>
	)
}

type ItemProps = {
	section: HomeSection
	disabled: boolean
	onVisibilityChange: () => void
}

function HomeArrangementItem({ section, disabled, onVisibilityChange }: ItemProps) {
	const { t } = useLocaleContext()
	const id = getHomeSectionId(section)!
	const label = t(`homeScene.${id}.title`)
	const {
		attributes,
		listeners,
		setNodeRef,
		setActivatorNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({
		id,
		disabled,
		transition: { duration: 250, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' },
	})
	const VisibilityIcon = section.visible ? Eye : EyeOff

	return (
		<li
			ref={setNodeRef}
			style={{ transform: CSS.Transform.toString(transform), transition }}
			className={cn('flex items-center rounded-md bg-secondary/80', {
				'bg-secondary/40': !section.visible,
			})}
		>
			<button
				ref={setActivatorNodeRef}
				{...attributes}
				{...listeners}
				type="button"
				disabled={disabled}
				aria-label={t(`${BASE}.reorder`, { section: label })}
				className={cn(
					'py-4 pl-4 min-w-0 flex-1 cursor-grab touch-none rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring',
					{
						'opacity-60': !section.visible,
						'cursor-grabbing': isDragging,
						'cursor-not-allowed': disabled,
					},
				)}
			>
				<Text size="sm">{label}</Text>
			</button>
			<div className="pr-4 flex items-center">
				<IconButton
					size="xs"
					variant="ghost"
					disabled={disabled}
					onClick={onVisibilityChange}
					aria-label={label}
					aria-pressed={section.visible}
				>
					<VisibilityIcon aria-hidden="true" className="h-4 w-4" />
				</IconButton>
			</div>
		</li>
	)
}
