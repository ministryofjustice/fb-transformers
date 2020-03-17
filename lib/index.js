const { homedir } = require('os')
const path = require('path')
const glob = require('glob-all')
const {
  readFile,
  writeFile
} = require('sacred-fs')
const debug = require('debug')

const error = debug('component-transformer')

async function createUploadCheckStep (filePath) {
  const page = await getJson(filePath)

  const {
    _id,
    components = [],
    steps = [],
    url
  } = page

  steps.splice(0, 0, _id.concat('-upload-check'))

  const upload = {
    ...page,
    components: components.reduce((accumulator, { _id, _type, ...component }) => (_type === 'fileupload') ? accumulator.concat({ _id, _type: 'upload', ...component }) : accumulator.concat({ _id, _type, ...component }), []),
    steps,
    url
  }

  const uploadCheck = {
    _id: _id.concat('-upload-check'),
    _type: 'page.uploadCheck',
    url: url.concat('-upload-check')
  }

  await writeFile(filePath, JSON.stringify(upload, null, 2))

  await writeFile(filePath.replace('.json', '-upload-check.json'), JSON.stringify(uploadCheck, null, 2))
}

async function createUploadSummaryStep (filePath) {
  const page = await getJson(filePath)

  const {
    _id,
    components = [],
    steps = [],
    url
  } = page

  steps.splice(1, 0, _id.concat('-upload-summary'))

  const upload = {
    ...page,
    components: components.reduce((accumulator, { _id, _type, ...component }) => (_type === 'fileupload') ? accumulator.concat({ _id, _type: 'upload', ...component }) : accumulator.concat({ _id, _type, ...component }), []),
    steps,
    url
  }

  const uploadSummary = {
    _id: _id.concat('-upload-summary'),
    _type: 'page.uploadSummary',
    url: url.concat('-upload-summary')
  }

  await writeFile(filePath, JSON.stringify(upload, null, 2))

  await writeFile(filePath.replace('.json', '-upload-summary.json'), JSON.stringify(uploadSummary, null, 2))
}

function getFilePathList (d) {
  return (
    new Promise((resolve, reject) => {
      glob(`${d}/**/metadata/page/*`, (e, a) => !e ? resolve(a) : reject(e))
    })
  )
}

async function transformFileUploadComponents (filePath) {
  const {
    components = []
  } = await getJson(filePath)

  await Promise.all(components.map(async (component) => {
    const { _type } = component

    if (_type === 'fileupload') {
      const { maxFiles = 1 } = component

      if (maxFiles > 0 && !await hasUploadCheckStep(filePath)) await createUploadCheckStep(filePath)
      if (maxFiles > 1 && !await hasUploadSummaryStep(filePath)) await createUploadSummaryStep(filePath)
    }
  }))

  return filePath
}

function transformStepsFor (d) {
  return async function transformSteps (p, s) {
    const a = await p

    const filePath = `${d}/${s}.json`

    a.push(filePath)

    await transformFileUploadComponents(filePath)

    const {
      steps = []
    } = await getJson(filePath)

    return steps.reduce(transformStepsFor(d), a)
  }
}

async function transformPages (p, filePath) {
  const a = await p
  const {
    steps = []
  } = await getJson(filePath)

  const d = path.dirname(filePath)

  a.push(filePath)

  return steps.reduce(transformStepsFor(d), a)
}

async function includePageStart (p, filePath) {
  try {
    const a = await p
    const {
      _type
    } = await getJson(filePath)

    return (_type === 'page.start') // page start
      ? a.concat(filePath)
      : a
  } catch ({ message }) {
    error(message)
  }
}

async function excludePageStart (p, filePath) {
  try {
    const a = await p
    const {
      _type
    } = await getJson(filePath)

    return (_type !== 'page.start') // not page start
      ? a.concat(filePath)
      : a
  } catch ({ message }) {
    error(message)
  }
}

/*
 *  `page.start` and connected to `page.start`
 */
async function getIncludePageStart (filePathList, master) {
  return (await filePathList.reduce(includePageStart, []))
    .filter((filePath) => !master.includes(filePath))
}

async function transformIncludePageStart (...args) {
  return (await getIncludePageStart(...args))
    .reduce(transformPages, [])
}

/*
 *  Not `page.start` and not connected to `page.start`
 */
async function getExcludePageStart (filePathList, master) {
  return (await filePathList.reduce(excludePageStart, []))
    .filter((filePath) => !master.includes(filePath))
}

async function transformExcludePageStart (...args) {
  return (await getExcludePageStart(...args))
    .reduce(transformPages, [])
}

const getPath = (p) => path.resolve(p.replace(/^~/, homedir))

const getJson = async (p) => JSON.parse(await readFile(getPath(p), 'utf8'))

async function hasFileUploadComponent (p) {
  try {
    const {
      components = []
    } = await getJson(p)

    return components.some(({ _type }) => _type === 'fileupload')
  } catch ({ message }) {
    error(message)

    return false
  }
}

async function hasUploadComponent (p) {
  try {
    const {
      components = []
    } = await getJson(p)

    return components.some(({ _type }) => _type === 'upload')
  } catch ({ message }) {
    error(message)

    return false
  }
}

async function hasUploadCheckStep (p) {
  try {
    const {
      steps = []
    } = await getJson(p)

    if (steps.length) {
      const d = path.dirname(getPath(p))
      const a = await Promise.all(
        steps.map((s) => getJson(`${d}/${s}.json`))
      )

      return a.some(({ _type }) => _type === 'page.uploadCheck')
    }
  } catch ({ message }) {
    error(message)
  }

  return false
}

async function hasUploadSummaryStep (p) {
  try {
    const {
      steps = []
    } = await getJson(p)

    if (steps.length) {
      const d = path.dirname(getPath(p))
      const a = await Promise.all(
        steps.map((s) => getJson(`${d}/${s}.json`))
      )

      return a.some(({ _type }) => _type === 'page.uploadSummary')
    }
  } catch ({ message }) {
    error(message)
  }

  return false
}

function mapFileUploadComponentInForm (p, master = []) {
  return async (p) => {
    if (await hasFileUploadComponent(p)) return true

    const {
      steps = []
    } = await getJson(p)

    if (steps.length) {
      const d = path.dirname(getPath(p))

      return Array.from(await Promise.all(
        steps.map((s) => hasFileUploadComponentInForm(`${d}/${s}.json`))
      )).includes(true)
    }

    return false
  }
}

/*
 *  Path to a form, e.g. `~/Documents/formbuilder/forms/MyForm`
 *  or to all forms, e.g. `~/Documents/formbuilder/forms`
 */
async function hasFileUploadComponentInForm (formPath, master = []) {
  if (!formPath) throw new Error('Path is not defined')

  const filePathList = await getFilePathList(getPath(formPath))

  if (filePathList.length) {
    try {
      master = master.concat(await getIncludePageStart(filePathList, master))

      if (Array.from(await Promise.all(
        master.map(mapFileUploadComponentInForm(formPath, master))
      )).includes(true)) return true

      master = master.concat(await getExcludePageStart(filePathList, master))

      if (Array.from(await Promise.all(
        master.map(mapFileUploadComponentInForm(formPath, master))
      )).includes(true)) return true
    } catch ({ message }) {
      error(message)
    }
  }

  return false
}

/*
 *  Path to a form, e.g. `~/Documents/formbuilder/forms/MyForm`
 *  or to all forms, e.g. `~/Documents/formbuilder/forms`
 */
async function transformFileUploadComponentsInForm (formPath, master = []) {
  if (!formPath) throw new Error('Path is not defined')

  const filePathList = await getFilePathList(getPath(formPath))

  master = master.concat(await transformIncludePageStart(filePathList, master))
  master = master.concat(await transformExcludePageStart(filePathList, master))

  return master
}

module.exports = {
  hasFileUploadComponent,
  transformFileUploadComponents,
  hasUploadComponent,
  hasUploadCheckStep,
  hasUploadSummaryStep,
  hasFileUploadComponentInForm,
  transformFileUploadComponentsInForm
}
