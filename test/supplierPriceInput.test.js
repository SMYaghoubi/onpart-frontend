const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync(require.resolve('../supplier/index.html'), 'utf8');
const ascii = html.split('\n').find(line => line.includes('const asciiDigits ='));
const start = html.indexOf('    function numberValue(');
const end = html.indexOf('    const quantityValue', start);
const { priceValue, priceText, formatPriceInput } = new Function(ascii + '\n' + html.slice(start, end)
  + '\nreturn { priceValue, priceText, formatPriceInput };')();

function field(value, caret = value.length) {
  return { value, selectionStart:caret, setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; } };
}

test('supplier prices group immediately on both editable price fields', () => {
  assert.equal((html.match(/oninput="formatPriceInput\(this,event\)"/g) || []).length, 2);
  for (const [raw, expected] of [['50000','50/000'],['500000','500/000'],['۵۰۰۰۰','50/000'],['٥٠٠٠٠','50/000'],
    ['1,000,000','1/000/000'],['50/00','5/000'],['00050000','50/000'],['0','0'],['','']]) {
    const input = field(raw);
    formatPriceInput(input, {});
    assert.equal(input.value, expected, raw);
    assert.equal(input.selectionStart, expected.length, raw);
    assert.equal(priceValue(input.value), raw === '' ? null : Number(raw.replace(/[۰-۹٠-٩]/g, c => c.charCodeAt(0) & 15).replace(/[/,]/g,'')));
  }
});

test('typing across a thousands boundary preserves the caret and keeps numeric payloads', () => {
  const input = field('');
  for (const digit of '50000') {
    const position = input.selectionStart;
    input.value = input.value.slice(0, position) + digit + input.value.slice(position);
    input.selectionStart = position + 1;
    formatPriceInput(input, {});
  }
  assert.equal(input.value, '50/000');
  assert.equal(input.selectionStart, 6);
  assert.equal(JSON.stringify({ supplier_price:priceValue(input.value) }), '{"supplier_price":50000}');
  const middle = field('501/000', 3);
  formatPriceInput(middle, {});
  assert.equal(middle.value, '501/000');
  assert.equal(middle.selectionStart, 3);
});

test('deleting digits or separators remains editable instead of trapping the caret', () => {
  const input = field('50000', 2);
  formatPriceInput(input, { inputType:'deleteContentBackward' });
  assert.equal(input.value, '50/000');
  assert.equal(input.selectionStart, 2);
  input.value = input.value.slice(0,1) + input.value.slice(2);
  input.selectionStart = 1;
  formatPriceInput(input, { inputType:'deleteContentBackward' });
  assert.equal(input.value, '5/000');
  assert.equal(input.selectionStart, 1);
});

test('composition and invalid or out-of-range amounts are not silently changed', () => {
  const composing = field('50000');
  formatPriceInput(composing, { isComposing:true });
  assert.equal(composing.value, '50000');
  for (const value of ['-50000','50.5','abc','50000 تومان', String(Math.floor(Number.MAX_SAFE_INTEGER/11)+1)]) {
    const input = field(value);
    formatPriceInput(input, {});
    assert.equal(input.value, value);
    assert.throws(() => priceValue(value));
  }
  for (const value of ['10/00','1000/000','10//000']) assert.throws(() => priceValue(value));
  const limit = Math.floor(Number.MAX_SAFE_INTEGER/11);
  assert.equal(priceValue(priceText(limit)), limit);
});
