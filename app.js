#!/usr/bin/env node

const debug = require('debug')
const commander = require('commander')

const {
  hasFileUploadComponentInForm,
  transformFileUploadComponentsInForm,
  hasFileUploadComponent,
  transformFileUploadComponents,
  hasUploadComponent,
  hasUploadCheckStep,
  hasUploadSummaryStep
} = require('./lib')

const PACKAGE = require('./package')

const log = debug('transformers:log')
const error = debug('transformers:error')

const hasFileUploadInFormFlag = (commander) => Reflect.has(commander, 'hasFileUploadInForm')
const getFileUploadInFormFlag = (commander) => Reflect.get(commander, 'hasFileUploadInForm')

const hasTransformInFormFlag = (commander) => Reflect.has(commander, 'transformFileUploadInForm')
const getTransformInFormFlag = (commander) => Reflect.get(commander, 'transformFileUploadInForm')

const hasFileUploadFlag = (commander) => Reflect.has(commander, 'hasFileUpload')
const getFileUploadFlag = (commander) => Reflect.get(commander, 'hasFileUpload')

const hasTransformFileUploadFlag = (commander) => Reflect.has(commander, 'transformFileUpload')
const getTransformFileUploadFlag = (commander) => Reflect.get(commander, 'transformFileUpload')

const hasUploadFlag = (commander) => Reflect.has(commander, 'hasUpload')
const getUploadFlag = (commander) => Reflect.get(commander, 'hasUpload')

const hasUploadCheckFlag = (commander) => Reflect.has(commander, 'hasUploadCheck')
const getUploadCheckFlag = (commander) => Reflect.get(commander, 'hasUploadCheck')

const hasUploadSummaryFlag = (commander) => Reflect.has(commander, 'hasUploadSummary')
const getUploadSummaryFlag = (commander) => Reflect.get(commander, 'hasUploadSummary')

{
  const {
    version
  } = PACKAGE

  const {
    argv,
    env: {
      DEBUG = 'transformers*'
    }
  } = process

  debug.enable(DEBUG)

  commander
    .version(version)
    .option('-h, --has-file-upload-in-form [hasFileUploadInForm]', 'Form has `fileupload` component(s)')
    .option('-t, --transform-file-upload-in-form [transformFileUploadInForm]', 'Transform `fileupload` component(s) in Form')
    .option('--has-file-upload [hasFileUpload]', 'Step has `fileupload` components(s)')
    .option('--transform-file-upload [transformFileUpload]', 'Transform `fileupload` components(s) in step')
    .option('--has-upload [hasUpload]', 'Step has `upload` components(s)')
    .option('--has-upload-check [hasUploadCheck]', 'Step has `page.uploadCheck` step')
    .option('--has-upload-summary [hasUploadSummary]', 'Step has `page.uploadSummary` step')
    .parse(argv)
}

async function app () {
  if (hasFileUploadInFormFlag(commander)) {
    try {
      log(await hasFileUploadComponentInForm(getFileUploadInFormFlag(commander)))
    } catch ({ message }) {
      error(message)
    }
  } else {
    if (hasTransformInFormFlag(commander)) {
      try {
        log(await transformFileUploadComponentsInForm(getTransformInFormFlag(commander)))
      } catch ({ message }) {
        error(message)
      }
    } else {
      if (hasFileUploadFlag(commander)) {
        try {
          log(await hasFileUploadComponent(getFileUploadFlag(commander)))
        } catch ({ message }) {
          error(message)
        }
      } else {
        if (hasTransformFileUploadFlag(commander)) {
          try {
            log(await transformFileUploadComponents(getTransformFileUploadFlag(commander)))
          } catch ({ message }) {
            error(message)
          }
        } else {
          if (hasUploadFlag(commander)) {
            try {
              log(await hasUploadComponent(getUploadFlag(commander)))
            } catch ({ message }) {
              error(message)
            }
          } else {
            if (hasUploadCheckFlag(commander)) {
              try {
                log(await hasUploadCheckStep(getUploadCheckFlag(commander)))
              } catch ({ message }) {
                error(message)
              }
            } else {
              if (hasUploadSummaryFlag(commander)) {
                try {
                  log(await hasUploadSummaryStep(getUploadSummaryFlag(commander)))
                } catch ({ message }) {
                  error(message)
                }
              } else {
                log('No arguments')
              }
            }
          }
        }
      }
    }
  }
}

module.exports = app()
