import Code from '~components/markdoc/Code';

export default {
	render: Code,
	attributes: {
		content: { type: String },
		language: {
			type: String,
			description: 'The programming language of the code block. Place it after the backticks.',
		},
	},
};
