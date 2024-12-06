import { Button, Card, IconButton, ToolTip } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { ArrowRight, MinusCircle } from 'lucide-react'
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
		<FilterGroupContext.Provider value={{ groupIdx: idx }}>
			<Card className="ml-4">
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
											<ArrowRight className="h-4 w-4 text-foreground-muted" />
											<OperatorSelect idx={filterIndex} />
										</>
									)}
									{filter.operation && (
										<>
											<ArrowRight className="h-4 w-4 text-foreground-muted" />
											<FilterValue idx={filterIndex} />
										</>
									)}
								</div>

								<div className="flex h-full w-12 shrink-0 items-center justify-end transition-opacity duration-200 group-hover/filter:opacity-100 md:opacity-0">
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
				</div>
			</Card>
		</FilterGroupContext.Provider>
	)
}

const LOCALE_KEY = 'createOrUpdateSmartListForm.fields.queryBuilder.filters'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
