import antfu from '@antfu/eslint-config'

export default antfu({}, {
  rules: {
    'curly': ['error', 'all'],
    'no-console': 'warn',
    'style/brace-style': ['error', '1tbs'],
    'style/max-len': ['error', { code: 120 }],
  },
})
