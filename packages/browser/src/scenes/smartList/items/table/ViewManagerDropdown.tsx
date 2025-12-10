import { Button, ConfirmationModal, Dropdown } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

import { useDeleteSelectedView } from '../../hooks'
import { useSmartListViewStore } from '../../store'
import CreateOrUpdateTableView from './CreateOrUpdateTableView'

const LOCALE_BASE_KEY = 'userSmartListScene.itemsScene.actionHeader.viewManager'
const withLocaleKey = (key: string) => `${LOCALE_BASE_KEY}.${key}`

export default function ViewManagerDropdown() {
	const [managerState, setManagerState] = useState<'create' | 'update' | 'delete' | 'none'>('none')

	const { t } = useLocaleContext()
	const workingView = useSmartListViewStore((state) => state.workingView)
	const selectedView = useSmartListViewStore((state) => state.selectedView)
	const { deleteSelectedView, isDeleting } = useDeleteSelectedView()

	const handleDelete = async () => {
		await deleteSelectedView()
		setManagerState('none')
	}

	return (
		<>
			<Dropdown>
				<Dropdown.Trigger asChild>
					<Button
						disabled={!workingView}
						className="h-10 shrink-0 divide-opacity-30 bg-background-surface/50 px-0 py-0 hover:bg-background-surface/80 data-[state=open]:bg-background-surface"
					>
						<div className="inline-flex h-full items-center divide-x divide-edge">
							<span className="flex h-full items-center px-3 py-2">{t('common.save')}</span>
							<span className="flex h-full items-center px-1 py-2">
								<ChevronDown className="h-4 w-4" />
							</span>
						</div>
					</Button>
				</Dropdown.Trigger>
				<Dropdown.Content align="end">
					<Dropdown.Item disabled={!selectedView} onClick={() => setManagerState('update')}>
						{t(withLocaleKey('updateSelected'))}
					</Dropdown.Item>
					<Dropdown.Item disabled={!workingView} onClick={() => setManagerState('create')}>
						{t(withLocaleKey('create'))}
					</Dropdown.Item>
					<Dropdown.Separator />
					<Dropdown.Item
						disabled={!selectedView}
						className="text-red-500 focus:text-red-500"
						onClick={() => setManagerState('delete')}
					>
						{t(withLocaleKey('deleteSelected'))}
					</Dropdown.Item>
				</Dropdown.Content>
			</Dropdown>

			<CreateOrUpdateTableView
				isCreating={managerState === 'create'}
				isOpen={managerState === 'create' || managerState === 'update'}
				onClose={() => setManagerState('none')}
			/>

			<ConfirmationModal
				isOpen={managerState === 'delete'}
				onClose={() => setManagerState('none')}
				onConfirm={handleDelete}
				confirmIsLoading={isDeleting}
				title={t(withLocaleKey('deleteModal.title'))}
				description={`${t(withLocaleKey('deleteModal.description'))} "${selectedView?.name}"`}
				confirmText={t('common.delete')}
			/>
		</>
	)
}
