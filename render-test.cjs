// JSDOM render test — loads the REAL compiled bundle (public/app.js) with
// React/ReactDOM globals and asserts #root gets populated (no blank page).
const { JSDOM } = require('/Users/snyco/.workbuddy-ai/binaries/node/workspace/node_modules/jsdom');
const React = require('/Users/snyco/.workbuddy-ai/binaries/node/workspace/node_modules/react');
const ReactDOM = require('/Users/snyco/.workbuddy-ai/binaries/node/workspace/node_modules/react-dom');
const fs = require('fs');

const html = fs.readFileSync('public/index.html', 'utf8');
const dom = new JSDOM(html, { url: 'http://localhost:4000/', pretendToBeVisual: true });
const { window } = dom;

// Globals the bundle expects
window.React = React;
window.ReactDOM = ReactDOM;
window.fetch = () => Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({ error: 'no server' }), text: () => Promise.resolve('{}') });
global.window = window;
global.document = window.document;
global.navigator = window.navigator;
global.localStorage = window.localStorage;

const errors = [];
const origError = console.error;
console.error = (...a) => { errors.push(a.map(String).join(' ')); origError(...a); };

const bundle = fs.readFileSync('public/app.js', 'utf8');
try {
  // Execute the bundle inside the window scope via indirect eval on window
  const fn = new Function('window', 'document', 'navigator', 'localStorage', 'React', 'ReactDOM', 'fetch', bundle);
  fn(window, window.document, window.navigator, window.localStorage, React, ReactDOM, window.fetch);
} catch (e) {
  console.error('BUNDLE THREW:', e && e.message);
  process.exitCode = 1;
}

// Give React a tick to flush effects
setTimeout(() => {
  const root = window.document.getElementById('root');
  const childCount = root ? root.children.length : 0;
  const text = root ? root.textContent : '';
  const hasLogin = !!window.document.querySelector('input');
  console.log('--- RENDER RESULT ---');
  console.log('#root children:', childCount);
  console.log('#root text length:', text.length);
  console.log('has <input> (login form):', hasLogin);
  console.log('react errors captured:', errors.length);
  if (childCount > 0 && text.length > 10 && hasLogin) {
    console.log('VERDICT: PASS — app rendered, #root populated, login form present');
  } else {
    console.log('VERDICT: FAIL — blank page risk');
    process.exitCode = 1;
  }
}, 100);
