import { NativeSelect } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useCallback, useMemo } from 'react'

import { useSmartListContext } from '../../context'

const LOCALE_BASE_KEY = 'userSmartListScene.itemsScene.actionHeader.viewSelector'
const withLocaleKey = (key: string) => `${LOCALE_BASE_KEY}.${key}`

export default function SavedViewSelector() {
	const { t } = useLocaleContext()
	const {
		workingView,
		selectedView,
		selectStoredView,
		list: { views },
	} = useSmartListContext()

	const translateKey = useCallback((key: string) => t(withLocaleKey(key)), [t])

	const defaultViewLabel = useMemo(() => translateKey('defaultView'), [translateKey])
	const customViewLabel = useMemo(() => translateKey('customView'), [translateKey])

	/**
	 * The options available to the user to select from, pulled from the saved views on
	 * the smart list
	 */
	const options = useMemo(() => {
		const baseOptions = (views ?? []).map(({ name }) => ({ label: name, value: name }))
		if (baseOptions.length) {
			return [{ label: defaultViewLabel, value: '' }, ...baseOptions]
		} else {
			return baseOptions
		}
	}, [views, defaultViewLabel])

	/**
	 * The empty option to display when there are no saved views. This will be undefined if there are
	 * saved views so the default view is selectable
	 */
	const emptyOption = useMemo(
		() =>
			options.length
				? undefined
				: { label: workingView ? customViewLabel : defaultViewLabel, value: '' },
		[options, workingView, customViewLabel, defaultViewLabel],
	)

	/**
	 * A change handler to update the selected view in the context
	 */
	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			const name = e.target.value
			if (!name) {
				selectStoredView(undefined)
			} else {
				const view = views?.find((view) => view.name === name)
				if (view) {
					selectStoredView(view)
				}
			}
		},
		[views, selectStoredView],
	)

	const isDisabled = !views || !views.length

	return (
		<NativeSelect
			title={isDisabled ? translateKey('noViewsSaved') : translateKey('selectView')}
			className="h-8 w-[185px] py-0"
			options={options}
			emptyOption={emptyOption}
			disabled={isDisabled}
			value={selectedView?.name}
			onChange={handleChange}
		/>
	)
}
