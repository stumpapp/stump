import { useContext, useMemo } from 'react';
import { Box, Tab, TabList, Tabs } from '@chakra-ui/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppPropsContext } from '@stump/client';

const DEFAULT_PAGES = [
	{
		path: '/settings/general',
		shortName: 'general',
		displayName: 'General',
	},
	{
		path: '/settings/users',
		shortName: 'users',
		displayName: 'Users',
	},
	{
		path: '/settings/server',
		shortName: 'server',
		displayName: 'Server',
	},
	{
		path: '/settings/jobs',
		shortName: 'jobs',
		displayName: 'Jobs',
	},
];

const DESKTOP_PAGE = {
	path: '/settings/desktop',
	shortName: 'desktop',
	displayName: 'Desktop',
};

export default function SettingsNavigation() {
	const appProps = useContext(AppPropsContext);
	const navigate = useNavigate();

	const location = useLocation();

	const pages = useMemo(() => {
		let base = DEFAULT_PAGES;

		if (appProps?.platform !== 'browser') {
			// insert into 2nd position
			base = [...base.slice(0, 1), DESKTOP_PAGE, ...base.slice(1)];
		}

		return base.map((page, i) => ({ ...page, index: i }));
	}, [appProps?.platform]);

	const activeTab = useMemo(
		() => pages.find((p) => p.path === location.pathname)?.index ?? 0,
		[location],
	);

	function handleChange(index: number) {
		const page = pages.find((p) => p.index === index);

		if (page && index !== activeTab) {
			navigate(`/settings/${page.shortName}`);
		}
	}

	// Note: idk how I feel about this UI...
	return (
		<Box py={[2, 2, 0]} px={4} w="full">
			<Tabs index={activeTab} onChange={handleChange} colorScheme="brand" w="full">
				<TabList>
					{pages.map((page) => (
						<Tab key={page.path}>{page.displayName}</Tab>
					))}
				</TabList>
			</Tabs>
		</Box>
	);
}
