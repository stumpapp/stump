import { Dropdown, IconButton, ToolTip } from '@stump/components'
import { BookPlus, FolderPlus, Upload } from 'lucide-react'

type Props = {
	onSelect: (type: 'books' | 'series') => void
}

export default function UploadMenu({ onSelect }: Props) {
	return (
		<Dropdown modal={false}>
			<ToolTip content="Upload" side="left" size="sm">
				<Dropdown.Trigger asChild>
					<IconButton
						variant="ghost"
						size="xs"
						className="hover:bg-background-surface-hover"
						pressEffect={false}
						disabled={false}
					>
						<Upload className="h-4 w-4" />
					</IconButton>
				</Dropdown.Trigger>
			</ToolTip>

			<Dropdown.Content align="end">
				<Dropdown.Group>
					<Dropdown.Item onClick={() => onSelect('books')}>
						<BookPlus className="mr-2 h-4 w-4" />
						<span>Add books</span>
					</Dropdown.Item>

					<Dropdown.Item onClick={() => onSelect('series')}>
						<FolderPlus className="mr-2 h-4 w-4" />
						<span>Add series</span>
					</Dropdown.Item>
				</Dropdown.Group>
			</Dropdown.Content>
		</Dropdown>
	)
}
