function enhanceShopFilter(select, normalize) {
  const wrapper = select.parentElement;
  const label = wrapper.querySelector('.sb-filter-val');
  const defaultLabel = label.textContent;
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'sb-filter-trigger';
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', select.id + '-menu');
  for (const child of [...wrapper.children]) {
    if (child !== select) trigger.append(child);
  }

  const panel = document.createElement('div');
  panel.id = select.id + '-menu';
  panel.className = 'sb-filter-menu';
  panel.hidden = true;
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', defaultLabel);
  panel.innerHTML = '<div class="sb-menu-search"><i class="ti ti-search" aria-hidden="true"></i><input type="search" autocomplete="off"></div>'
    + '<div class="sb-menu-options"></div><p class="sb-menu-empty" role="status" hidden>گزینه‌ای پیدا نشد</p>';
  const search = panel.querySelector('input');
  search.placeholder = 'جست‌وجوی ' + defaultLabel;
  search.setAttribute('aria-label', search.placeholder);
  const options = panel.querySelector('.sb-menu-options');
  const empty = panel.querySelector('.sb-menu-empty');

  function renderOptions() {
    const query = normalize(search.value, true);
    const fragment = document.createDocumentFragment();
    for (const option of select.options) {
      if (query && !normalize(option.textContent, true).includes(query)
        && !normalize(option.value, true).includes(query)) continue;
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'sb-menu-option';
      item.dataset.value = option.value;
      item.setAttribute('aria-pressed', String(option.selected));

      const name = document.createElement('span');
      name.textContent = option.textContent;
      item.append(name);
      if (option.selected) {
        const check = document.createElement('i');
        check.className = 'ti ti-check';
        check.setAttribute('aria-hidden', 'true');
        item.append(check);
      }
      fragment.append(item);
    }
    options.replaceChildren(fragment);
    options.scrollTop = 0;
    empty.hidden = options.childElementCount > 0;
  }

  function sync() {
    label.textContent = select.value ? select.selectedOptions[0].textContent : defaultLabel;
    trigger.setAttribute('aria-label', select.value ? defaultLabel + '، ' + label.textContent : defaultLabel);
    wrapper.classList.toggle('has-selection', Boolean(select.value));
    if (!panel.hidden) renderOptions();
  }

  function close(returnFocus = false) {
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    if (returnFocus) trigger.focus();
  }

  function open() {
    search.value = '';
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    renderOptions();
    search.focus();
  }

  trigger.addEventListener('click', () => panel.hidden ? open() : close());
  search.addEventListener('input', renderOptions);
  options.addEventListener('click', event => {
    const item = event.target.closest('.sb-menu-option');
    if (!item) return;
    select.value = item.dataset.value;
    close(true);
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  document.addEventListener('pointerdown', event => {
    if (!wrapper.contains(event.target)) close();
  });
  wrapper.addEventListener('focusout', event => {
    if (event.relatedTarget && !wrapper.contains(event.relatedTarget)) close();
  });
  wrapper.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) {
      event.preventDefault();
      close(true);
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    if (panel.hidden) return open();
    const items = [...options.children];
    const index = items.indexOf(document.activeElement);
    const next = event.key === 'ArrowDown' ? items[index + 1] : items[index - 1] || (index < 0 && items.at(-1));
    (next || search).focus();
  });

  select.hidden = true;
  wrapper.classList.add('enhanced');
  wrapper.append(trigger, panel);
  sync();
  return sync;
}
