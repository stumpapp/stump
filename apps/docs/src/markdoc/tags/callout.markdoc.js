import Callout from '~components/markdoc/Callout';

export default {
	render: Callout,
	description: 'Display the enclosed content in a callout box',
	children: ['paragraph', 'tag', 'list', 'link'],
	attributes: {
		icon: {
			type: String,
			default: 'note',
			matches: ['note', 'warning', 'check', 'danger'],
			description:
				'Controls the color and icon of the callout. Can be: "caution", "check", "note", "warning"',
		},
		title: {
			type: String,
			description: 'The title displayed at the top of the callout',
		},
	},
};
