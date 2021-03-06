const cheerio = require('cheerio')
const got = require('got')
const exec = require('../lib/exec')

async function get (route) {
  const res = await got(`http://localhost:4000${route}`, { followRedirect: false })
  const $ = cheerio.load(res.body, { xmlMode: true })
  $.res = Object.assign({}, res)
  return $
}

async function getJSON (route) {
  const { body } = await got(`http://localhost:4000${route}`, { json: true })
  return body
}

describe('basic example', () => {
  let server
  beforeAll(async (done) => {
    server = exec('node cli.js serve examples/basic', done)
  })

  afterAll(async (done) => {
    await server.kill()
    done()
  })

  test('data references', async () => {
    const $ = await get('/hello')
    expect($.text().includes('The meaning of life is 42')).toBe(true)
  })

  test('default layout', async () => {
    const $ = await get('/hello')
    expect($('body#default-layout').length).toBe(1)
  })
})

describe('custom example', () => {
  let server
  beforeAll(async (done) => {
    server = exec('node cli.js serve examples/custom', done)
  })

  afterAll(async (done) => {
    await server.kill()
    done()
  })

  describe('data', () => {
    test('is ingested from JSON, YML, and YAML files', async () => {
      const { data } = await getJSON('/?json')
      const expected = {
        good_ol_json: { acronym: 'JavaScript Object Notation' },
        yaml_with_an_a: { stance: 'I spell it YAML' },
        yaml_with_no_a: { stance: 'I spell it YML' }
      }
      expect(data).toEqual(expected)
    })
  })

  describe('layouts', () => {
    test('custom default layout', async () => {
      const $ = await get('/')
      expect($.text().includes('I am a new default.')).toBe(true)
    })

    test('custom layout', async () => {
      const $ = await get('/fancy')
      expect($('body#another-layout').length).toBe(1)
    })
  })

  describe('middleware', async () => {
    test('afterContext', async () => {
      const context = await getJSON('/?json')
      expect(context.modifiedByMiddleware).toBe(true)
    })

    test('beforeRender', async () => {
      const context = await getJSON('/?json')
      expect(context.page.modifiedByMiddleware).toBe(true)
    })
  })

  describe('permalinks', async () => {
    test('can be set in frontmatter', async () => {
      const context = await getJSON('/fancy?json')
      expect(context.page.permalinks.includes('/even-fancier')).toBe(true)
    })

    test('can be set using jexConfig.afterPageInitialized', async () => {
      const context = await getJSON('/fancy?json')
      expect(context.page.permalinks.includes('/fancy-customized-at-runtime-permalink')).toBe(true)
    })
  })

  describe('redirects', () => {
    test('page-level redirects in frontmatter', async () => {
      const { res } = await get('/old-fancy')
      expect(res.headers.location).toBe('/fancy')
    })

    // test('global redirects object in jexConfig', async () => {
    //   const { res } = await get('/old-global-fancy')
    //   expect(res.headers.location).toBe('/fancy')
    // })
  })

  // 404
  // custom 404
  // layouts have access to context
})
