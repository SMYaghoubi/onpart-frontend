const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(path.join(__dirname,'..','shop.html'),'utf8');
const expected=['code','description','car','brand','category','flow','availability','price','quantity','total'];
const header=source.slice(source.indexOf('<thead>'),source.indexOf('</thead>'));
const row=source.slice(source.indexOf('return `<tr id="productRow_'),source.indexOf('</tr>`;',source.indexOf('return `<tr id="productRow_')));
const columns=section=>[...section.matchAll(/<(?:th|td)\b[^>]*data-column="([^"]+)"/g)].map(match=>match[1]);

test('desktop product headers and cells have the same ten-column semantic order',()=>{
  assert.deepEqual(columns(header),expected);
  assert.deepEqual(columns(row),expected);
});

test('vehicle header maps directly to the vehicle cell and stale selection offset is gone',()=>{
  assert.match(header,/<th[^>]*data-column="car"[^>]*>خودرو<\/th>/);
  assert.match(row,/<td[^>]*data-column="car"[^>]*>[\s\S]*?\$\{safeCar\}[\s\S]*?<\/td>/);
  assert.doesNotMatch(source,/\.tbl th:nth-child\(3\)|sel-dot|type="radio"/);
  assert.match(source,/\.tbl th\[data-column="description"\] \{ text-align: right; \}/);
});

test('all table empty loading and error colspans match the ten real columns',()=>{
  const spans=[...source.matchAll(/colspan="(\d+)"/g)].map(match=>Number(match[1]));
  assert.ok(spans.length>=3);
  assert.ok(spans.every(value=>value===expected.length),spans.join(','));
});

test('mobile cards hide the desktop header and keep a one-column semantic card',()=>{
  assert.match(source,/@media \(max-width:640px\)[\s\S]*?\.tbl thead \{ display:none; \}/);
  assert.match(source,/\.tbl tbody tr \{ display:grid; grid-template-columns:1fr;/);
  assert.match(source,/\.prod-meta \{ display:flex!important/);
  assert.match(source,/td\.qty-cell \{ display:block!important; \}/);
});
