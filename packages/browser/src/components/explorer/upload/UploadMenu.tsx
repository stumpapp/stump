import { Dropdown, IconButton, ToolTip } from '@stump/components'
import { BookPlus, FolderPlus, Upload } from 'lucide-react'

import { useTranslate } from '@/hooks/useTranslate'
import { useSeriesContextSafe } from '@/scenes/series/context'

type Props = {
	onSelect: (type: 'books' | 'series') => void
}

export default function UploadMenu({ onSelect }: Props) {
	const { t, translate } = useTranslate()
	const enableSeries = useSeriesContextSafe() == null

	return (
		<Dropdown modal={false}>
			<ToolTip content={translate('shared.common.upload')} side="left" size="sm">
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
						<span>{t('common.addBooks')}</span>
					</Dropdown.Item>

					{enableSeries && (
						<Dropdown.Item onClick={() => onSelect('series')}>
							<FolderPlus className="mr-2 h-4 w-4" />
							<span>{t('common.addSeries')}</span>
						</Dropdown.Item>
					)}
				</Dropdown.Group>
			</Dropdown.Content>
		</Dropdown>
	)
}
