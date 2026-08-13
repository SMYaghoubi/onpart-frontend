const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','shop.html'),'utf8');

test('shop free search caches only code, description, brand and category',()=>{
  assert.match(source,/_searchText: normalizeSearch\(\[p\.description,p\.brand,p\.category\]\.join\(' '\),true\)/);
  assert.match(source,/_codeSearch: API\.normalizeProductCode\(p\.code\)/);
  const cacheBlock=source.slice(source.indexOf('_searchText:'),source.indexOf('_carKey:'));
  assert.doesNotMatch(cacheBlock,/p\.car|p\.note/);
  assert.match(source,/placeholder="جستجو در کد\/OEM، شرح محصول، برند یا گروه کالا\.\.\."/);
});

test('shop combines free OR matching with normalized exact AND filters',()=>{
  const filter=source.slice(source.indexOf('function doFilter()'),source.indexOf('function updateFilterSummary'));
  assert.match(filter,/p\._searchText\.includes\(t\)\|\|p\._codeSearch\.includes\(codeSearch\)/);
  assert.match(filter,/&&\(!car\|\|p\._carKey===car\)&&\(!br\|\|p\._brandKey===br\)&&\(!cat\|\|p\._catKey===cat\)/);
  assert.doesNotMatch(filter,/p\.car===car|_catSearch\.includes/);
});

test('shop gets dynamic no-cache metadata instead of hard-coded filter values',()=>{
  assert.match(source,/API\.request\('\/api\/products\/metadata'\)/);
  assert.match(source,/setFilterOptions\('fCar',metadata\.cars/);
  assert.match(source,/setFilterOptions\('fBrand',metadata\.brands/);
  assert.match(source,/setFilterOptions\('fCat',metadata\.categories/);
  assert.doesNotMatch(source,/<option>پژو ۴۰۵<\/option>|<option>BOSCH<\/option>|<option>TEXTAR<\/option>/);
  assert.match(source,/option\.textContent=label/);
});

test('search remains debounced and every filter change performs one filtered render',()=>{
  assert.match(source,/function scheduleFilter\(\)\{clearTimeout\(filterTimer\);filterTimer=setTimeout\(doFilter,140\)\}/);
  const filter=source.slice(source.indexOf('function doFilter()'),source.indexOf('function updateFilterSummary'));
  assert.equal((filter.match(/render\(\)/g)||[]).length,1);
  assert.match(source,/id="fCar" onchange="doFilter\(\)/);
  assert.match(source,/id="fBrand" onchange="doFilter\(\)/);
  assert.match(source,/id="fCat" onchange="doFilter\(\)/);
  assert.match(source,/function clearFilters\(\)[\s\S]*?doFilter\(\)/);
});
