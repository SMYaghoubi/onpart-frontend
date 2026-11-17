(() => {
  const section = document.getElementById('shop-filters');
  const field = name => section.querySelector('#filterAdmin' + name);
  const group = field('Group');
  const search = field('Search');
  const list = field('List');
  const status = field('Status');
  const add = field('Add');
  const retry = field('Retry');
  const dialog = field('Dialog');
  const name = field('Name');
  const form = field('Form');
  const formStatus = field('FormStatus');
  const cancel = field('Cancel');
  const submit = form.querySelector('[type="submit"]');
  const endpoint = '/api/products/metadata';
  const key = value => API.normalizeProductCode(value).replace(/[يى]/g, 'ی').replace(/ك/g, 'ک');
  const compare = new Intl.Collator('fa', { sensitivity: 'base', numeric: true }).compare;
  let groups;
  let editing;
  let busy = false;

  function message(element, text, error = false) {
    element.textContent = text;
    element.toggleAttribute('data-error', error);
  }

  function button(text, onClick) {
    const control = document.createElement('button');
    control.type = 'button';
    control.className = 'filter-admin-button';
    control.textContent = text;
    control.disabled = busy;
    control.addEventListener('click', onClick);
    return control;
  }

  function render() {
    if (!groups) return;
    const query = key(search.value);
    const entries = groups[group.value].filter(entry => key(entry.label).includes(query) || key(entry.source).includes(query));
    const fragment = document.createDocumentFragment();
    for (const entry of entries) {
      const row = document.createElement('div');
      row.className = 'filter-admin-row';
      row.setAttribute('role', 'listitem');
      const label = document.createElement('div');
      label.className = 'filter-admin-name';
      const title = document.createElement('strong');
      title.textContent = entry.label;
      const details = document.createElement('small');
      details.textContent = (entry.hidden ? 'پنهان در فروشگاه' : 'نمایش در فروشگاه')
        + (entry.label !== entry.source ? ' · نام ثبت‌شده در محصول: ' + entry.source : '');
      label.append(title, details);
      const actions = document.createElement('div');
      actions.className = 'filter-admin-actions';
      const edit = button('ویرایش نام', () => editName(entry));
      const toggle = button(entry.hidden ? 'نمایش دوباره' : 'پنهان‌کردن', () =>
        save({ ...entry, group: group.value, hidden: !entry.hidden }));
      edit.setAttribute('aria-label', 'ویرایش نام ' + entry.label);
      toggle.setAttribute('aria-label', toggle.textContent + ' ' + entry.label);
      actions.append(edit, toggle);
      row.append(label, actions);
      fragment.append(row);
    }
    list.replaceChildren(fragment);
    message(status, entries.length ? new Intl.NumberFormat('fa').format(entries.length) + ' گزینه' : 'گزینه‌ای پیدا نشد');
  }

  async function load() {
    add.disabled = true;
    retry.hidden = true;
    message(status, 'در حال دریافت گزینه‌ها…');
    try {
      const data = await API.request(endpoint + '?admin=1', { authContext: 'admin', cache: 'no-store' });
      const valid = ['cars', 'brands', 'categories'].every(type =>
        Array.isArray(data[type]) && data[type].every(entry =>
          typeof entry?.source === 'string' && typeof entry.label === 'string' && typeof entry.hidden === 'boolean'));
      if (!valid) throw new Error();
      groups = data;
      add.disabled = false;
      render();
    } catch {
      message(status, 'دریافت گزینه‌های فیلتر انجام نشد.', true);
      retry.hidden = false;
    }
  }

  function editName(entry) {
    editing = entry;
    field('DialogTitle').textContent = entry ? 'ویرایش نام گزینه' : 'افزودن گزینه';
    name.value = entry?.label ?? '';
    message(formStatus, '');
    dialog.showModal();
    name.focus();
    name.select();
  }

  function setBusy(value) {
    busy = value;
    group.disabled = add.disabled = submit.disabled = cancel.disabled = name.disabled = value;
    list.querySelectorAll('button').forEach(control => { control.disabled = value; });
  }

  async function save(rule) {
    if (busy) return;
    const fromDialog = dialog.open;
    const entries = groups[rule.group];
    const pendingStatus = fromDialog ? formStatus : status;
    setBusy(true);
    message(pendingStatus, 'در حال ذخیره…');
    try {
      const saved = await API.request(endpoint, { method: 'PUT', authContext: 'admin', body: JSON.stringify(rule) });
      const index = entries.findIndex(entry => key(entry.source) === key(saved.source));
      if (index === -1) {
        entries.push(saved);
        search.value = '';
      } else {
        entries[index] = saved;
      }
      entries.sort((a, b) => compare(a.label, b.label));
      setBusy(false);
      if (fromDialog) dialog.close();
      render();
      search.focus();
      Admin.toast('گزینهٔ فیلتر ذخیره شد', 'success');
    } catch (error) {
      message(pendingStatus, error.message || 'ذخیرهٔ گزینه انجام نشد.', true);
    } finally {
      setBusy(false);
    }
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const label = name.value.trim();
    if (!key(label)) return message(formStatus, 'نام گزینه را وارد کنید.', true);
    const source = editing?.source ?? label;
    if (groups[group.value].some(entry =>
      entry !== editing && (key(entry.source) === key(source) || key(entry.label) === key(label)))) {
      return message(formStatus, 'این نام در لیست وجود دارد. گزینهٔ موجود را ویرایش یا دوباره فعال کنید.', true);
    }
    save({ group: group.value, source, label, hidden: editing?.hidden ?? false });
  });

  group.addEventListener('change', () => { search.value = ''; render(); });
  search.addEventListener('input', render);
  add.addEventListener('click', () => editName());
  retry.addEventListener('click', load);
  cancel.addEventListener('click', () => dialog.close());
  dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  load();
})();
