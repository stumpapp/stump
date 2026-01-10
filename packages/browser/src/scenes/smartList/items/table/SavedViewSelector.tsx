import { NativeSelect } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useCallback, useMemo } from 'react'

import { defaultWorkingView, useSmartListContext } from '../../context'
import { useSmartListViewStore } from '../../store'
import { viewsAreEqual } from '../../utils'

const LOCALE_BASE_KEY = 'userSmartListScene.itemsScene.actionHeader.viewSelector'
const withLocaleKey = (key: string) => `${LOCALE_BASE_KEY}.${key}`

export default function SavedViewSelector() {
	const { t } = useLocaleContext()
	const {
		list: { views },
	} = useSmartListContext()
	const workingView = useSmartListViewStore((state) => state.workingView)
	const selectedView = useSmartListViewStore((state) => state.selectedView)
	const selectStoredView = useSmartListViewStore((state) => state.selectStoredView)

	const translateKey = useCallback((key: string) => t(withLocaleKey(key)), [t])

	const defaultViewLabel = useMemo(() => translateKey('defaultView'), [translateKey])
	const customViewLabel = useMemo(() => translateKey('customView'), [translateKey])

	/**
	 * Whether the working view has diverged from the selected view (or default if none selected).
	 * When true, we should show "Custom view" instead of the selected view name.
	 */
	const hasWorkingViewDiverged = useMemo(() => {
		// If there's a workingView but no selectedView, compare against default
		if (workingView && !selectedView) {
			return !viewsAreEqual(workingView, defaultWorkingView)
		}

		// If there's both, compare them
		if (workingView && selectedView) {
			return !viewsAreEqual(workingView, selectedView)
		}

		// No workingView means we're at default
		return false
	}, [workingView, selectedView])

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
	 * The current value to display in the selector.
	 * Shows "Custom view" (empty with custom label) if the working view has diverged.
	 */
	const currentValue = useMemo(() => {
		if (hasWorkingViewDiverged) {
			return '__custom__'
		}
		return selectedView?.name ?? ''
	}, [hasWorkingViewDiverged, selectedView?.name])

	/**
	 * The final options including a custom view option if needed
	 */
	const finalOptions = useMemo(() => {
		if (hasWorkingViewDiverged) {
			return [{ label: customViewLabel, value: '__custom__' }, ...options]
		}
		return options
	}, [hasWorkingViewDiverged, customViewLabel, options])

	/**
	 * A change handler to update the selected view in the context
	 */
	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			const name = e.target.value
			if (!name || name === '__custom__') {
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
			options={finalOptions}
			emptyOption={emptyOption}
			disabled={isDisabled}
			value={currentValue}
			onChange={handleChange}
		/>
	)
}
