# nuxt-param-validators

Nuxt module that helps you add validation to your route, inspired by [SvelteKit][svelte-route-matching].

## Quick Setup

1. Add `nuxt-param-validators` dependency to your project

      ```bash
      # Using yarn
      yarn add --dev nuxt-param-validators

      # Using pnpm
      pnpm add -D nuxt-param-validators

      # Using npm
      npm install --save-dev nuxt-param-validators
      ```

2. Add `nuxt-param-validators` to the `modules` section of `nuxt.config.ts`

      ```ts
      export default defineNuxtConfig({
        modules: [
          'nuxt-param-validators'
        ]
      })
      ```

3. Create a validator in the `validators` dir

      ```ts
      // validators/is-number.ts
      export default defineParamValidator(param => /^\d+$/.test(param))
      ```

4. Rename your route, eg: `pages/[id=is-number].vue`

[svelte-route-matching]: https://kit.svelte.dev/docs/advanced-routing#matching
