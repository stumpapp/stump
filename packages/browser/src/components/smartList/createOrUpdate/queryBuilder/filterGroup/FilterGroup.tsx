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
								className="group/filter p-4 md:items-center relative flex items-start"
							>
								<div className="gap-x-4 gap-y-2 md:gap-4 flex flex-1 flex-wrap items-center">
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

								<div className="w-12 md:opacity-0 flex h-full shrink-0 items-center justify-end transition-opacity duration-200 group-hover/filter:opacity-100">
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

				<div className="h-12 space-x-4 px-4 flex items-center bg-background-surface/45">
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
