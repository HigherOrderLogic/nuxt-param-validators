import { resolve } from 'node:path'

export default defineNuxtConfig({
  alias: {
    'nuxt-param-validators': resolve(__dirname, '../../../src/module.ts'),
  },
  modules: ['nuxt-param-validators'],
})
