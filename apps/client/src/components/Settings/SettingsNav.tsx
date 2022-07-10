import React, { useMemo } from 'react';
import { Box, Tab, TabList, Tabs } from '@chakra-ui/react';
import { useLocation, useNavigate } from 'react-router-dom';

const pages = [
	{
		path: '/settings/general',
		shortName: 'general',
		index: 0,
	},
	{
		path: '/settings/users',
		shortName: 'users',
		index: 1,
	},
	{
		path: '/settings/server',
		shortName: 'server',
		index: 2,
	},
];

export default function SettingsNav() {
	const navigate = useNavigate();

	const location = useLocation();

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
					<Tab>General</Tab>
					<Tab>Users</Tab>
					<Tab>Server</Tab>
					<Tab disabled>Jobs</Tab>
				</TabList>
			</Tabs>
		</Box>
	);
}
