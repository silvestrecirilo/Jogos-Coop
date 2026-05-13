import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['dist/**/*']
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['firestore.rules'],
    plugins: {
      'firebase-security': firebaseRulesPlugin
    },
    languageOptions: {
      parser: firebaseRulesPlugin.parsers.rules,
    },
    rules: {
      ...firebaseRulesPlugin.configs.recommended.rules,
    }
  }
];
