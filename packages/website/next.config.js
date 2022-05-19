const withMarkdoc = require('@markdoc/next.js');

/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	pageExtensions: ['tsx', 'js', 'md'],
};

// @ts-ignore: withMarkdoc not showing valid type definition
module.exports = withMarkdoc({ schemaPath: './src/markdoc', mode: 'static' })(nextConfig);
