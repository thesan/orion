#!/usr/bin/env node

const { existsSync, mkdirSync, readFileSync, watchFile, writeFileSync } = require('fs')
const { basename, join } = require('path')
const { merge } = require('lodash')
const mjml2html = require('mjml')
const { compile } = require('handlebars')

const ghRaw = 'https://raw.githubusercontent.com/Joystream'
const gleevLogos = `${ghRaw}/design/master/logo/gleev`

const contexts = {
  gleev: {
    title: 'Hi alice,',
    subTitle: 'You have a new notifications:',

    app: {
      name: 'Gleev',
      nameAlt: 'Gleev.xyz',
      logo: `${gleevLogos}/gleev-viewer/horizontal/color/light/margin/png/gleev-logo%401x.png`,
      logoAlt: `${gleevLogos}/gleev-viewer/icon/color/light/margin/png/gleev-logo%401x.png`,
      homepage: 'https://gleev.xyz',
      notificationPage: 'https://gleev.xyz',
      unsubscribeLink: 'https://gleev.xyz',
    },

    notification: {
      text: 'bob replied to your comment under the video: “Web3 Wages & Salaries Demystified”',
      link: 'https://gleev.xyz',
      date: '07 Jul 2023 at 10:41',
      avatar: `${ghRaw}/founding-members/main/avatars/primary-avatar/1.png`,
      icon: `${ghRaw}/atlas/master/packages/atlas/src/assets/icons/svgs/action-council.svg`,
      iconColor: '#5A58FF',
    },
  },

  get studio() {
    return merge({}, this.gleev, {
      title: 'Your channel “Joyblocks”,',
      subTitle: 'Has a new notifications:',
      app: {
        name: 'Studio',
        logo: `${gleevLogos}/gleev-studio/color/light/margin/png/studio-logo%401x.png`,
      },
    })
  },
}

const args = process.argv
const inputStarts = args.indexOf('-i') + 1
const inputEnds = args.indexOf('-o', inputStarts)
const inputs = args.slice(inputStarts, inputEnds)
const templateDir = getArg('-o')
const previewDir = getArg('-p')
const shouldWatch = args.indexOf('--watch') > -1

process.stdout.write('\nStarted!\n')

if (!inputs.length) throw 'Missing input files!'

const dirs = { templateDir, previewDir }
for (const key in dirs) {
  const dir = dirs[key]
  if (!dir) throw `Missing ${key}!`
  if (existsSync(dir)) continue
  process.stdout.write(`Create: ${dir}\n`)
  mkdirSync(dir, { recursive: true })
}

for (const path of inputs) {
  processFile(path)
  if (shouldWatch) {
    process.stdout.write(`Watching ${path}...\n`)
    watchFile(path, { interval: 200 }, () => {
      process.stdout.write(`\n${path} was updated!\n`)
      processFile(path)
    })
  }
}

function processFile(path) {
  const fileName = basename(path).replace(/\.mjml$/, '')
  const content = readFileSync(path, { encoding: 'utf8' })

  const template = mjml2html(content).html
  const templatePath = join(templateDir, fileName)
  writeFileSync(templatePath, template)
  process.stdout.write(`Template file written at: ${templatePath}\n`)

  for (const app of Object.keys(contexts)) {
    const context = contexts[app]
    const previewPath = join(previewDir, fileName.replace(/\..*$/, `-${app}.html`))
    const preview = compile(template, { strict: true })(context)
    writeFileSync(previewPath, preview)
    process.stdout.write(`Preview file written at: ${previewPath}\n`)
  }
}

function getArg(key) {
  const index = args.indexOf(key) + 1
  if (index) return args[index]
}
