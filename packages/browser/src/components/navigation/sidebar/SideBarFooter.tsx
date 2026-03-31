import SettingsButton from './Settings'

export default function SideBarFooter() {
	return (
		<footer className="gap-1.5 flex flex-col">
			<div className="flex items-center justify-between">
				<SettingsButton />
			</div>
		</footer>
	)
}
