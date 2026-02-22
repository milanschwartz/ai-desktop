export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Type enum - conventional commit types
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation only
        'style', // Code style (formatting, semicolons, etc.)
        'refactor', // Code change that neither fixes a bug nor adds a feature
        'perf', // Performance improvement
        'test', // Adding or correcting tests
        'build', // Build system or external dependencies
        'ci', // CI configuration files and scripts
        'chore', // Other changes that don't modify src or test files
        'revert', // Reverts a previous commit
      ],
    ],
    // Subject case
    'subject-case': [2, 'always', 'lower-case'],
    // Subject must not end with period
    'subject-full-stop': [2, 'never', '.'],
    // Header max length
    'header-max-length': [2, 'always', 100],
    // Body max line length
    'body-max-line-length': [2, 'always', 100],
    // Require scope for certain types (optional, can be relaxed)
    // 'scope-enum': [2, 'always', ['api', 'web', 'shared', 'docs', 'ci']],
  },
};
