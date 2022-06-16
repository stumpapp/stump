import Link from '~components/ui/Link';

const MarkdocLink = (props) => <Link className="text-brand" {...props} />;

export default {
	render: MarkdocLink,
	attributes: {
		href: {
			type: String,
		},
		title: {
			type: String,
		},
	},
};
