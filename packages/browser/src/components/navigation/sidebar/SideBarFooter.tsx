import SettingsButton from './Settings'

// TODO(ui): i think the user menu can either go in a similar header (i.e., so it is always visible,
// e.g. SideBarHeader) or just live here

export default function SideBarFooter() {
	return (
		<footer className="-mx-2 bottom-0 backdrop-blur-md gap-1.5 sticky z-10 mt-auto flex flex-col bg-sidebar/80 group-data-[variant=floating]:rounded-b-lg">
			<div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
				<SettingsButton />
			</div>
		</footer>
	)
}
