import { Button, Dropdown } from '@stump/components'
import { Ellipsis } from 'lucide-react'

import { useTranslate } from '@/hooks/useTranslate'

type Props = {
	onSelectForDelete: () => void
	onSelectForInspect: () => void
}

export default function APIKeyActionMenu({ onSelectForDelete, onSelectForInspect }: Props) {
	const { t } = useTranslate()

	return (
		<Dropdown modal={false}>
			<Dropdown.Trigger asChild>
				<Button size="icon" variant="ghost">
					<Ellipsis className="h-4 w-4 text-foreground" />
				</Button>
			</Dropdown.Trigger>

			<Dropdown.Content align="end">
				<Dropdown.Group>
					<Dropdown.Item onClick={onSelectForInspect} data-testid="inspect-key">
						<span>{t(getKey('inspect'))}</span>
					</Dropdown.Item>

					<Dropdown.Item onClick={onSelectForDelete} data-testid="delete-key">
						<span>{t(getKey('delete'))}</span>
					</Dropdown.Item>
				</Dropdown.Group>
			</Dropdown.Content>
		</Dropdown>
	)
}

const LOCALE_BASE = 'settingsScene.app/apiKeys.sections.table.actionMenu'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
