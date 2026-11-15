#!/usr/bin/env node
/* Exports the typewriter illustration to assets/typewriter/typewriter.svg.

     node assets-src/typewriter/export.js

   The drawing itself lives in prototypes/shared/typewriter.js (one source for the prototype and the asset).
   Layer ids for animation: #paper, #carriage, #typebars (#bar-0..25), #keys (#key-A.., #key-space, #key-return, #key-back), #bell. */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..');
const tw = require(path.join(root, 'prototypes/shared/typewriter.js'));
const out = path.join(root, 'assets/typewriter');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'typewriter.svg'), tw.build() + '\n');
console.log('wrote assets/typewriter/typewriter.svg');
