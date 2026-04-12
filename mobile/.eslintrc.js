/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ['expo'],
  plugins: ['@typescript-eslint'],
  rules: {
    /**
     * Enforce `import type` for type-only imports.
     *
     * Critical for plugin packages (tracker, task, chunter, contact,
     * notification, activity) that depend on @hcengineering/ui -> svelte.
     * Using value imports would pull Svelte into the Metro bundle.
     */
    '@typescript-eslint/consistent-type-imports': [
      'error',
      {
        prefer: 'type-imports',
        disallowTypeAnnotations: true,
        fixStyle: 'separate-type-imports',
      },
    ],
  },
}
