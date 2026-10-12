// Configuración de lint para Expo SDK 57.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/**', 'supabase/functions/**'] },
]);
