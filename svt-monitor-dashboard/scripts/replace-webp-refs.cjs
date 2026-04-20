const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..', 'src')
const textExt = new Set(['.vue', '.ts', '.tsx', '.js', '.jsx', '.scss', '.css'])
const files = []

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) {
      walk(full)
      continue
    }
    if (textExt.has(path.extname(name).toLowerCase())) {
      files.push(full)
    }
  }
}

walk(root)

const pattern = /(@\/assets\/images\/[^'")\s]+?)\.(png|jpg|jpeg)/g
let touched = 0
let replacements = 0

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8')
  let changed = false

  content = content.replace(pattern, (all, basePath) => {
    const sourceRel = basePath.replace('@/', 'src/') + '.webp'
    const sourceAbs = path.resolve(__dirname, '..', sourceRel)
    if (!fs.existsSync(sourceAbs)) return all
    changed = true
    replacements += 1
    return `${basePath}.webp`
  })

  if (changed) {
    fs.writeFileSync(file, content, 'utf8')
    touched += 1
  }
}

console.log(`files_touched=${touched} replacements=${replacements}`)
