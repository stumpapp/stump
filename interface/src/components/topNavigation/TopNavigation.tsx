import { cn, NavigationMenu, navigationMenuTriggerStyle } from '@stump/components'
import { Book, Cog, Home, LibraryBig } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router-dom'

import { useLocaleContext } from '@/i18n'
import paths from '@/paths'

export default function TopNavigation() {
	const { t } = useLocaleContext()

	return (
		<div className="h-12 w-full border-b border-edge bg-sidebar px-4">
			<NavigationMenu className="z-[100] h-full">
				<NavigationMenu.List>
					<NavigationMenu.Item>
						<Link to={paths.home()}>
							<NavigationMenu.Link
								className={navigationMenuTriggerStyle({
									className: 'bg-sidebar text-contrast-300 hover:bg-sidebar-300',
								})}
							>
								<Home className="mr-2 h-4 w-4" />
								{t('sidebar.buttons.home')}
							</NavigationMenu.Link>
						</Link>
					</NavigationMenu.Item>

					<NavigationMenu.Item>
						<Link to={paths.bookSearch()}>
							<NavigationMenu.Link
								className={navigationMenuTriggerStyle({
									className: 'bg-sidebar text-contrast-300 hover:bg-sidebar-300',
								})}
							>
								<Book className="mr-2 h-4 w-4" />
								Explore
							</NavigationMenu.Link>
						</Link>
					</NavigationMenu.Item>

					<NavigationMenu.Item>
						<NavigationMenu.Trigger
							className={navigationMenuTriggerStyle({
								className: 'bg-sidebar text-contrast-300 hover:bg-sidebar-300',
							})}
						>
							<LibraryBig className="mr-2 h-4 w-4" />
							Libraries
						</NavigationMenu.Trigger>
						<NavigationMenu.Content>
							<ul className="grid gap-3 p-4 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
								<li className="row-span-3">
									<NavigationMenu.Link asChild>
										<a
											className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
											href="/"
										>
											{/* <Icons.logo className="h-6 w-6" /> */}
											<div className="mb-2 mt-4 text-lg font-medium">shadcn/ui</div>
											<p className="text-muted-foreground text-sm leading-tight">
												Beautifully designed components built with Radix UI and Tailwind CSS.
											</p>
										</a>
									</NavigationMenu.Link>
								</li>
								<ListItem href="/docs" title="Introduction">
									Re-usable components built using Radix UI and Tailwind CSS.
								</ListItem>
								<ListItem href="/docs/installation" title="Installation">
									How to install dependencies and structure your app.
								</ListItem>
								<ListItem href="/docs/primitives/typography" title="Typography">
									Styles for headings, paragraphs, lists...etc
								</ListItem>
							</ul>
						</NavigationMenu.Content>
					</NavigationMenu.Item>
					<NavigationMenu.Item>
						<NavigationMenu.Trigger
							className={navigationMenuTriggerStyle({
								className: 'bg-sidebar text-contrast-300 hover:bg-sidebar-300',
							})}
						>
							Book clubs
						</NavigationMenu.Trigger>
						<NavigationMenu.Content>
							<ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] ">
								{/* {components.map((component) => (
								<ListItem key={component.title} title={component.title} href={component.href}>
									{component.description}
								</ListItem>
							))} */}
							</ul>
						</NavigationMenu.Content>
					</NavigationMenu.Item>

					<NavigationMenu.Item>
						<Link to={paths.settings()}>
							<NavigationMenu.Link
								className={navigationMenuTriggerStyle({
									className: 'bg-sidebar text-contrast-300 hover:bg-sidebar-300',
								})}
							>
								<Cog className="mr-2 h-4 w-4" />
								Settings
							</NavigationMenu.Link>
						</Link>
					</NavigationMenu.Item>
				</NavigationMenu.List>
			</NavigationMenu>
		</div>
	)
}

const ListItem = React.forwardRef<React.ElementRef<'a'>, React.ComponentPropsWithoutRef<'a'>>(
	({ className, title, children, ...props }, ref) => {
		return (
			<li>
				<NavigationMenu.Link asChild>
					<a
						ref={ref}
						className={cn(
							'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors',
							className,
						)}
						{...props}
					>
						<div className="text-sm font-medium leading-none">{title}</div>
						<p className="text-muted-foreground line-clamp-2 text-sm leading-snug">{children}</p>
					</a>
				</NavigationMenu.Link>
			</li>
		)
	},
)
ListItem.displayName = 'ListItem'
