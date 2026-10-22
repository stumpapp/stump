import SettingsButton from './Settings'

export default function SideBarFooter() {
	return (
		<footer className="-mx-2 bottom-0 backdrop-blur-md gap-1.5 sticky z-10 mt-auto flex flex-col bg-sidebar/80 group-data-[variant=floating]:rounded-b-lg">
			<div className="flex items-center justify-between">
				<SettingsButton />
			</div>
		</footer>
	)
}
