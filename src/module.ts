import { addImportsDir, addPluginTemplate, createResolver, defineNuxtModule, updateTemplates } from '@nuxt/kit'
import { globby } from 'globby'
import { genImport } from 'knitwork'
import { camelCase } from 'scule'

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

    const validators = (await globby(`${options.validatorsDir!}/*.{ts,js,cjs,mjs}`, { cwd: nuxt.options.rootDir }))
      .map(v => v.split('/').at(-1)!.replace(/\.(ts|js|cjs|mjs)$/, ''))

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

          functionBody.push(`  if(to.name === ${JSON.stringify(page.name)}) {`)

          for (const match of page.file.matchAll(/\[(?<param>[^\s=]+)=(?<validator>\S+?)\]/g)) {
            if (!match.groups) {
              continue
            }

            const { param, validator } = match.groups

            page.path = page.path.replace(`:${param}${validator}`, `:${param}`)

            if (!validators.some(val => camelCase(validator) === camelCase(val))) {
              throw new Error(`Validator '${validator}' not found for page ${page.path}`)
            }

            const resultVarName = `_${camelCase(validator)}${param}result`.replace(/\W/g, '')

            functionBody.push(
              `    try {`,
              // eslint-disable-next-line style/max-len
              `      const ${resultVarName} = await ${getValidatorName(validator)}(to.params.${param.replace(/\W/g, '')}, to, from)`,
              `      if (typeof ${resultVarName} !== 'undefined' && ${resultVarName} !== true) return ${resultVarName}`,
              `    } catch (e) {`,
              `      return createH3Error(e)`,
              `    }`,
            )
          }

          functionBody.push(...['   return', '}'])
        }

        return [
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
