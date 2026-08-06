import { Dropdown, IconButton, ToolTip } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { BookPlus, FolderPlus, Upload } from 'lucide-react'

import { useSeriesContextSafe } from '@/scenes/series'

type Props = {
	onSelect: (type: 'books' | 'series') => void
}

export default function UploadMenu({ onSelect }: Props) {
	const { t } = useLocaleContext()
	const enableSeries = useSeriesContextSafe() == null

	return (
		<Dropdown modal={false}>
			<ToolTip content={t('common.upload')} side="left" size="sm">
				<Dropdown.Trigger asChild>
					<IconButton variant="ghost" size="xs" className="hover:bg-accent" disabled={false}>
						<Upload className="h-4 w-4" />
					</IconButton>
				</Dropdown.Trigger>
			</ToolTip>

			<Dropdown.Content align="end">
				<Dropdown.Group>
					<Dropdown.Item onClick={() => onSelect('books')}>
						<BookPlus className="mr-2 h-4 w-4" />
						<span>{t('fileExplorer.uploadModal.menu.addBooks')}</span>
					</Dropdown.Item>

					{enableSeries && (
						<Dropdown.Item onClick={() => onSelect('series')}>
							<FolderPlus className="mr-2 h-4 w-4" />
							<span>{t('fileExplorer.uploadModal.menu.addSeries')}</span>
						</Dropdown.Item>
					)}
				</Dropdown.Group>
			</Dropdown.Content>
		</Dropdown>
	)
}
