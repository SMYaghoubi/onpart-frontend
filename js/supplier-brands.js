(function () {
  function key(value) {
    return String(value == null ? '' : value).normalize('NFKC')
      .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک')
      .replace(/[\u200c\u200d\u200e\u200f]/g, ' ')
      .replace(/\s+/g, ' ').trim().toLocaleLowerCase('fa-IR');
  }

  function resolve(value, allowedBrands) {
    const exact = String(value == null ? '' : value).normalize('NFC').trim();
    if (allowedBrands.includes(exact)) return exact;
    const matches = allowedBrands.filter(brand => key(brand) === key(exact));
    return matches.length === 1 ? matches[0] : null;
  }

  window.SupplierBrands = { key, resolve };
})();
