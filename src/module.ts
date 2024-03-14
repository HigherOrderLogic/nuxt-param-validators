import { readdir } from 'node:fs/promises'
import { addImportsDir, addPluginTemplate, createResolver, defineNuxtModule, updateTemplates, useLogger } from '@nuxt/kit'
import { genImport } from 'knitwork'
import { camelCase, kebabCase, pascalCase, snakeCase } from 'scule'

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
    const logger = useLogger(MODULE_NAME)
    const rootDirResolver = createResolver(nuxt.options.rootDir)

    addImportsDir(createResolver(import.meta.url).resolve('./runtime/composables'))

    const validators: string[] = []

    for (const file of await readdir(rootDirResolver.resolve(options.validatorsDir!)))
      validators.push(file.replace(/.ts$/, ''))

    addPluginTemplate({
      filename: 'param-validator-plugin.ts',
      getContents: ({ app: nuxtApp }) => {
        const getValidatorName = (v: string) => `_${camelCase(v)}Validator`

        let functionBody = ''

        for (const page of nuxtApp.pages || []) {
          if (!page.file)
            continue

          const paramsWithValidator = page.file.split(/[\[\]]/).filter(s => /\S+=\S+/.test(s))

          if (paramsWithValidator.length > 0) {
            const paramsAndValidators = paramsWithValidator.map((p) => {
              const [param, validator] = p.split('=')

              page.path = page.path.replace(`:${param}${validator}`, `:${param}`)

              return { param, validator }
            })

            functionBody += [
              `  if(to.name === \`${page.name}\`) {`,
              paramsAndValidators.map((pv) => {
                if (!validators.some(val => pv.validator === val
                  || pv.validator === camelCase(val)
                  || pv.validator === kebabCase(val)
                  || pv.validator === pascalCase(val)
                  || pv.validator === snakeCase(val))) {
                  logger.error(`Validator '${pv.validator}' not found for page ${page.path}`)
                  // eslint-disable-next-line node/prefer-global/process
                  process.exit(1) // straight exit because at this point, we wont be able to generate virtual file
                }

                const resultVarName = `_${camelCase(pv.validator)}${pv.param}result`.replaceAll('.', '')

                return [
                `   const ${resultVarName} = await ${getValidatorName(pv.validator)}(to.params.${pv.param.replaceAll('.', '')}, to, from)`,
                `   if (typeof ${resultVarName} !== 'undefined' && ${resultVarName} !== true) return ${resultVarName}`,
                ].join('\n')
              }).join('\n'),
              '   return',
              '}',
            ].join('\n')
          }
        }

        return [
          genImport('nuxt/app', ['defineNuxtPlugin', 'addRouteMiddleware']),
          validators.map(v => genImport(rootDirResolver.resolve(options.validatorsDir!, v), getValidatorName(v))).join('\n'),
          'export default defineNuxtPlugin(() => {',
          ' addRouteMiddleware(async (to, from) => {',
          functionBody,
          ' })',
          '})',
        ].join('\n')
      },
    })

    nuxt.hooks.hookOnce('build:before', updateTemplates)
  },
})
