import { Button, Card, cn, IconButton, Text, ToolTip } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { ArrowRight, Lock, MinusCircle } from 'lucide-react'
import { useFieldArray } from 'react-hook-form'

import { FilterGroupSchema, FilterSchema, SmartListFormSchema } from '../../schema'
import { FilterGroupContext } from './context'
import { FieldSelector } from './FieldSelector'
import { FilterValue } from './filterValue'
import GroupJoiner from './GroupJoiner'
import OperatorSelect from './OperatorSelect'

type Props = {
	idx: number
	group: FilterGroupSchema
}
export default function FilterGroup({ idx, group }: Props) {
	const { t } = useLocaleContext()

	const { remove: removeGroup } = useFieldArray<SmartListFormSchema>({
		name: 'filters.groups',
	})
	const { append, remove } = useFieldArray<SmartListFormSchema>({
		name: `filters.groups.${idx}.filters`,
	})

	return (
		<FilterGroupContext.Provider value={{ groupIdx: idx, isLocked: group.is_locked || false }}>
			<Card className={cn('ml-4', { 'cursor-not-allowed': group.is_locked })}>
				<div className="flex flex-col">
					{!group.filters.length && (
						<div className="p-4">
							<FieldSelector idx={0} />
						</div>
					)}

					{group.filters.map((filter, filterIndex) => {
						return (
							<div
								key={filterIndex}
								className="group/filter relative flex items-start p-4 md:items-center"
							>
								<div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-2 md:gap-4">
									<FieldSelector idx={filterIndex} />
									{filter.field && (
										<>
											<ArrowRight
												className={cn('h-4 w-4 text-foreground-muted', {
													'opacity-60': group.is_locked,
												})}
											/>
											<OperatorSelect idx={filterIndex} />
										</>
									)}
									{filter.operation && (
										<>
											<ArrowRight
												className={cn('h-4 w-4 text-foreground-muted', {
													'opacity-60': group.is_locked,
												})}
											/>
											<FilterValue idx={filterIndex} />
										</>
									)}
								</div>

								<div
									className={cn(
										'flex h-full w-12 shrink-0 items-center justify-end transition-opacity duration-200 group-hover/filter:opacity-100 md:opacity-0',
										{ 'group-hover/filter:opacity-0': group.is_locked },
									)}
								>
									<ToolTip content={t(getKey('actions.deleteFilter'))} align="end">
										<IconButton
											size="xs"
											className="text-foreground-muted transition-all duration-200 hover:text-fill-danger"
											onClick={() => remove(filterIndex)}
											disabled={group.filters.length === 1}
										>
											<MinusCircle className="h-4 w-4" />
										</IconButton>
									</ToolTip>
								</div>
							</div>
						)
					})}
				</div>

				<div className="flex h-12 items-center space-x-4 bg-background-surface/45 px-4">
					<GroupJoiner />

					<div className="flex-1" />

					{group.is_locked && (
						<div className="flex items-center space-x-2">
							<Lock className="h-4 w-4 text-foreground-muted" />
							<Text variant="muted" size="sm">
								{t(getKey('actions.locked'))}
							</Text>
						</div>
					)}
					{!group.is_locked && (
						<>
							<Button
								variant="ghost"
								size="sm"
								newYork
								onClick={() => append({} as FilterSchema)}
								className="shrink-0"
							>
								{t(getKey('actions.addFilter'))}
							</Button>

							<Button
								variant="ghost"
								size="sm"
								newYork
								className="shrink-0 hover:bg-fill-danger-secondary"
								onClick={() => removeGroup(idx)}
							>
								{t(getKey('actions.deleteGroup'))}
							</Button>
						</>
					)}
				</div>
			</Card>
		</FilterGroupContext.Provider>
	)
}

const LOCALE_KEY = 'createOrUpdateSmartListForm.fields.queryBuilder.filters'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
