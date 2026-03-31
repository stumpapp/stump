import { Alert, AlertDescription, Button, cn, cx, Tabs, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { AlertTriangle } from 'lucide-react'
import { useFormContext, useWatch } from 'react-hook-form'

import { SmartListFormSchema } from '../schema'
import { FilterGroup } from './filterGroup'
import GroupBy from './GroupBy'

// TODO: error states throughout form elems

type Props = {
	disabled?: boolean
}

export default function SmartListQueryBuilder({ disabled }: Props) {
	const form = useFormContext<SmartListFormSchema>()

	const [joiner] = useWatch({ control: form.control, name: ['filters.joiner'] })
	const {
		filters: { groups },
	} = useWatch({ control: form.control }) as SmartListFormSchema
	const { t } = useLocaleContext()

	return (
		<>
			<div className={cn('space-y-4 flex flex-col', { 'cursor-not-allowed opacity-65': disabled })}>
				<Alert variant="info" id="smart-list-performance" dismissible>
					<AlertTriangle />
					<AlertDescription>{t(getKey('uiPerformance'))}</AlertDescription>
				</Alert>

				<GroupBy disabled={disabled} />

				<div className={cn('space-x-3.5 flex items-center', { 'pointer-events-none': disabled })}>
					<Tabs variant="primary" activeOnHover value={joiner}>
						<Tabs.List className="rounded-lg">
							<Tabs.Trigger
								value="and"
								asChild
								className="w-8 rounded-lg px-1 text-xs min-w-[unset]"
								onClick={() => form.setValue('filters.joiner', 'and')}
							>
								<Text className="cursor-pointer truncate">{t(getKey('rootJoiner.and.label'))}</Text>
							</Tabs.Trigger>

							<Tabs.Trigger
								value="or"
								asChild
								className="w-8 rounded-lg px-1 text-xs min-w-[unset]"
								onClick={() => form.setValue('filters.joiner', 'or')}
							>
								<Text className={cx('truncate', { 'cursor-pointer': true })}>
									{t(getKey('rootJoiner.or.label'))}
								</Text>
							</Tabs.Trigger>
						</Tabs.List>
					</Tabs>

					<Text variant="muted" size="sm">
						{t(getKey(`rootJoiner.${joiner.toLowerCase()}.description`))}
					</Text>
				</div>

				<div
					className={cn('ml-4 space-y-8 px-2 pt-4 relative flex flex-col border-l border-l-edge', {
						'pointer-events-none': disabled,
					})}
				>
					{groups.length === 0 && (
						<div className="ml-4 max-w-sm rounded-lg p-4 flex items-center justify-center border border-dashed border-edge">
							<Text variant="muted">{t(getKey('filters.emptyState'))}</Text>
						</div>
					)}
					{groups.map((group, index) => (
						<FilterGroup key={index} idx={index} group={group} />
					))}
				</div>

				<div>
					<Button
						variant="outline"
						disabled={disabled}
						onClick={() => {
							form.setValue('filters.groups', [
								...groups,
								{
									filters: [],
									joiner: 'and',
								},
							])
						}}
					>
						{t(getKey('filters.actions.addGroup'))}
					</Button>
				</div>
			</div>
		</>
	)
}

const LOCALE_KEY = 'createOrUpdateSmartListForm.fields.queryBuilder'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
