import type { RouteLocationNormalized } from '#vue-router'

export type ValidatorReturn = ReturnType<ReturnType<typeof defineNuxtRouteMiddleware>>

export type Validator = (param: string, to: RouteLocationNormalized, from: RouteLocationNormalized) => ValidatorReturn

export function defineParamValidator(validator: Validator) {
  return validator
}
