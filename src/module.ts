import { addImportsDir, addPluginTemplate, createResolver, defineNuxtModule, updateTemplates } from '@nuxt/kit'
import { genImport } from 'knitwork'
import { camelCase, kebabCase, pascalCase, snakeCase } from 'scule'
import { globby } from 'globby'

export interface ModuleOptions {
  validatorsDir?: string
}

const MODULE_NAME = 'nuxt-param-validators'

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: MODULE_NAME,
    configKey: 'paramValidators',
    compatibility: {
      nuxt: '^3',
    },
  },
  defaults: {
    validatorsDir: 'validators',
  },
  async setup(options, nuxt) {
    const rootDirResolver = createResolver(nuxt.options.rootDir)

    addImportsDir(createResolver(import.meta.url).resolve('./runtime/composables'))

    const validators = (await globby(`${options.validatorsDir!}/*.{ts,js,cjs,mjs}`, { cwd: nuxt.options.rootDir })).map(v => v.split('/').at(-1)!.replace(/\.(ts|js|cjs|mjs)$/, ''))

    if (!validators.length) {
      return
    }

    addPluginTemplate({
      filename: 'param-validator-plugin.ts',
      getContents: ({ app: nuxtApp }) => {
        const getValidatorName = (v: string) => `_${camelCase(v)}Validator`

        const functionBody: string[] = []

        for (const page of nuxtApp.pages || []) {
          if (!page.file) {
            continue
          }

          functionBody.push(`  if(to.name === \`${page.name}\`) {`)

          for (const [_, pv] of page.file.matchAll(/\[(\S+?=\S+?)\]/g)) {
            const [param, validator] = pv.split('=')

            page.path = page.path.replace(`:${param}${validator}`, `:${param}`)

            if (!validators.some(val => validator === val
              || validator === camelCase(val)
              || validator === kebabCase(val)
              || validator === pascalCase(val)
              || validator === snakeCase(val))) {
              throw new Error(`Validator '${validator}' not found for page ${page.path}`)
            }

            const resultVarName = `_${camelCase(validator)}${param}result`.replaceAll('.', '')

            functionBody.push(...[
              `   const ${resultVarName} = await ${getValidatorName(validator)}(to.params.${param.replaceAll('.', '')}, to, from)`,
              `   if (typeof ${resultVarName} !== 'undefined' && ${resultVarName} !== true) return ${resultVarName}`,
            ])
          }

          functionBody.push(...['   return', '}'])
        }

        return [
          genImport('nuxt/app', ['defineNuxtPlugin', 'addRouteMiddleware']),
          ...validators.map(v => genImport(rootDirResolver.resolve(options.validatorsDir!, v), getValidatorName(v))),
          'export default defineNuxtPlugin(() => {',
          ' addRouteMiddleware(async (to, from) => {',
          ...functionBody,
          ' })',
          '})',
        ].join('\n')
      },
    })

    nuxt.hooks.hookOnce('build:before', updateTemplates)
  },
})
