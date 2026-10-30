const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const root = __dirname;
const projectId = 'todo-app-2-v7';
const firebase = JSON.parse(fs.readFileSync(path.join(root, 'firebase.json'), 'utf8'));
const aliases = JSON.parse(fs.readFileSync(path.join(root, '.firebaserc'), 'utf8'));

assert.equal(aliases.projects.default, projectId, 'Firebase project alias must be v7');
assert.deepEqual(Object.keys(firebase), ['hosting'], 'Only Hosting may be deployed here');
assert.equal(firebase.hosting.site, projectId, 'Hosting site must be v7');
assert.equal(firebase.hosting.public, 'dist', 'Hosting public directory must be dist');
assert.equal(firebase.hosting.predeploy, 'node qa-v7-hosting.cjs', 'Hosting safety hook is required');

const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
assert.equal(branch, 'v7-development', 'Only v7-development may deploy');
const gitRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: root, encoding: 'utf8' }).trim();
assert.equal(path.resolve(gitRoot), path.resolve(root), 'Unexpected Git worktree');

const publicDir = path.join(root, firebase.hosting.public);
assert(fs.statSync(publicDir).isDirectory(), 'Public directory is missing');
const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
for (const match of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)) {
  const source = match[1].replace(/&amp;/g, '&').split('?')[0];
  assert(source.startsWith('./'), `Unexpected script reference: ${source}`);
  assert(fs.statSync(path.join(publicDir, source)).isFile(), `Missing public script: ${source}`);
}

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(publicDir, 'firebase-config-v7.js'), 'utf8'), sandbox);
const config = sandbox.window.todo2V7FirebaseConfig;
assert(config && typeof config === 'object', 'v7 Firebase config is missing');
assert.equal(config.environment, projectId, 'Firebase environment must be v7');
assert.equal(config.projectId, projectId, 'Firebase project must be v7');
assert.equal(config.authDomain, `${projectId}.firebaseapp.com`, 'Firebase auth domain must be v7');
for (const key of ['apiKey', 'messagingSenderId', 'appId']) {
  assert(typeof config[key] === 'string' && config[key].trim(), `Firebase ${key} is missing`);
}

if (process.env.GCLOUD_PROJECT !== undefined || process.env.PROJECT_DIR !== undefined) {
  assert.equal(process.env.GCLOUD_PROJECT, projectId, 'Deployment target is not v7');
  assert.equal(path.resolve(process.env.PROJECT_DIR || ''), path.resolve(root), 'Deployment root is not this v7 worktree');
}

console.log('v7 Hosting safety check: PASS');
