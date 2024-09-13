import { fileURLToPath } from 'node:url'
import { $fetch, fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('basic fixtures', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
  })

  it.each([
    ['/true/1', 200],
    ['/true/more/a', 200],
    ['/true/should-be/1', 200],
    ['/false/1', 404],
    ['/slug/a', 200],
    ['/slug/1/a', 200],
    ['/mixed/1-and-a-false', 404],
    ['/mixed/1/a', 404],
    ['/is-number/1', 200],
    ['/is-number/007', 200],
    ['/is-number/a', 404],
  ])('path %s should be %s', async (path, statusCode) => {
    const { status } = await fetch(path)
    expect(status).toEqual(statusCode)
  })

  it('sees number', async () => {
    const html = await $fetch('/is-number/1')
    expect(html).toContain('The number is 1!')
  })
})
