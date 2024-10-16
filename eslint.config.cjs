module.exports = {
	env: {
		browser: true,
		es2021: true,
	},
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended', // Use recommended TypeScript rules
		'prettier',
	],
	parser: '@typescript-eslint/parser', // Use the TypeScript parser
	parserOptions: {
		ecmaVersion: 12,
		sourceType: 'module',
		project: './tsconfig.json', // Point to your TypeScript config
	},
	plugins: ['@typescript-eslint'], // Include the TypeScript plugin
	rules: {
		'sort-imports': [
			'error',
			{
				ignoreCase: false,
				ignoreDeclarationSort: false,
				ignoreMemberSort: false,
				memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
				allowSeparatedGroups: false,
			},
		],
		// Disable the no-unused-vars rule globally
		'@typescript-eslint/no-unused-vars': 'off',
		'lines-between-class-members': ['warn', 'always'],

		// Disable specific rules
		'@typescript-eslint/no-explicit-any': 'off', // Allow 'any' globally
		'@typescript-eslint/ban-ts-comment': [
			'error',
			{
				'ts-expect-error': 'allow-with-description', // Allow '@ts-ignore' with description
			},
		],
	},
};
