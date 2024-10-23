import { Button, Dropdown } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Ellipsis } from 'lucide-react'

type Props = {
	onSelectForDelete: () => void
	onSelectForInspect: () => void
}

export default function APIKeyActionMenu({ onSelectForDelete, onSelectForInspect }: Props) {
	const { t } = useLocaleContext()

	return (
		<Dropdown modal={false}>
			<Dropdown.Trigger asChild>
				<Button size="icon" variant="ghost">
					<Ellipsis className="h-4 w-4 text-foreground" />
				</Button>
			</Dropdown.Trigger>

			<Dropdown.Content align="end">
				<Dropdown.Group>
					<Dropdown.Item onClick={onSelectForInspect}>
						<span>{t(getKey('inspect'))}</span>
					</Dropdown.Item>

					<Dropdown.Item onClick={onSelectForDelete}>
						<span>{t(getKey('delete'))}</span>
					</Dropdown.Item>
				</Dropdown.Group>
			</Dropdown.Content>
		</Dropdown>
	)
}

const LOCALE_BASE = 'settingsScene.app/apiKeys.sections.table.actionMenu'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
