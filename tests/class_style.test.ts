import { describe, test, expect } from 'bun:test'
import { tokenize } from '../src/tokenizer.ts'
import { compile } from '../src/compiler.ts'
import { escapeHtml } from '../src/escape.ts'

/**
 * Compile a template string and evaluate it with the given data.
 * Returns the rendered HTML output.
 */
async function render(template: string, data: Record<string, unknown> = {}): Promise<string> {
  const tokens = tokenize(template)
  const result = compile(tokens)
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
  const fn = new AsyncFunction('__data', '__escape', '__include', `with (__data) {\n${result.code}\n}`)
  const output = await fn(data, escapeHtml, () => '')
  return output.output
}

// ── @class ─────────────────────────────────────────────────────────────────

describe('@class', () => {
  test('plain entries only', async () => {
    const html = await render(`<span @class(['p-4', 'mx-2'])></span>`)
    expect(html).toBe(`<span class="p-4 mx-2"></span>`)
  })

  test('conditional entries — truthy', async () => {
    const html = await render(
      `<span @class(['p-4', 'font-bold' => isActive])></span>`,
      { isActive: true },
    )
    expect(html).toBe(`<span class="p-4 font-bold"></span>`)
  })

  test('conditional entries — falsy', async () => {
    const html = await render(
      `<span @class(['p-4', 'font-bold' => isActive])></span>`,
      { isActive: false },
    )
    expect(html).toBe(`<span class="p-4"></span>`)
  })

  test('mixed plain and conditional', async () => {
    const html = await render(
      `<div @class(['p-4', 'font-bold' => isActive, 'text-gray-500' => !isActive, 'bg-red' => hasError])></div>`,
      { isActive: true, hasError: false },
    )
    expect(html).toBe(`<div class="p-4 font-bold"></div>`)
  })

  test('all conditionals false', async () => {
    const html = await render(
      `<span @class(['bold' => a, 'italic' => b])></span>`,
      { a: false, b: false },
    )
    expect(html).toBe(`<span class=""></span>`)
  })

  test('expression conditions', async () => {
    const html = await render(
      `<span @class(['highlight' => count > 0])></span>`,
      { count: 3 },
    )
    expect(html).toBe(`<span class="highlight"></span>`)
  })

  test('negation condition', async () => {
    const html = await render(
      `<span @class(['text-gray' => !isActive])></span>`,
      { isActive: false },
    )
    expect(html).toBe(`<span class="text-gray"></span>`)
  })

  test('double-quoted values', async () => {
    const html = await render(
      `<span @class(["p-4", "bold" => active])></span>`,
      { active: true },
    )
    expect(html).toBe(`<span class="p-4 bold"></span>`)
  })
})

// ── @style ─────────────────────────────────────────────────────────────────

describe('@style', () => {
  test('plain entries only', async () => {
    const html = await render(`<span @style(['background-color: red'])></span>`)
    expect(html).toBe(`<span style="background-color: red"></span>`)
  })

  test('conditional entries', async () => {
    const html = await render(
      `<span @style(['background-color: red', 'font-weight: bold' => isActive])></span>`,
      { isActive: true },
    )
    expect(html).toBe(`<span style="background-color: red; font-weight: bold"></span>`)
  })

  test('conditional entries — falsy', async () => {
    const html = await render(
      `<span @style(['background-color: red', 'font-weight: bold' => isActive])></span>`,
      { isActive: false },
    )
    expect(html).toBe(`<span style="background-color: red"></span>`)
  })

  test('commas inside style values', async () => {
    const html = await render(
      `<span @style(["font-family: Arial, sans-serif"])></span>`,
    )
    expect(html).toBe(`<span style="font-family: Arial, sans-serif"></span>`)
  })
})

// ── Escaping ───────────────────────────────────────────────────────────────

describe('XSS prevention', () => {
  test('@class escapes HTML in values', async () => {
    const html = await render(
      `<span @class([cls])></span>`,
      { cls: '<script>alert(1)</script>' },
    )
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>')
  })
})
