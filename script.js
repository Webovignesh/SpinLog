document.addEventListener('DOMContentLoaded', function() {
  // Supabase configuration
  const SUPABASE_URL = 'https://sbezfzqahlmejyahmqtm.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiZXpmenFhaGxtZWp5YWhtcXRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNjQ1NzQsImV4cCI6MjA2Nzg0MDU3NH0._0Xb9NQDnWYZfbwlNTqUUZM48yWBeVhvSG87owp-aIA';
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  // make your client available in the browser console
window.supabaseClient = supabase;


  // Popup functions
  function showPopup(type, message) {
    const popup = document.getElementById('customPopup');
    const spinner = document.getElementById('popupSpinner');
    const success = document.getElementById('popupSuccess');
    const error = document.getElementById('popupError');
    const messageEl = document.getElementById('popupMessage');
    spinner.style.display = 'none';
    success.style.display = 'none';
    error.style.display = 'none';
    messageEl.textContent = message;
    if (type === 'loading') {
      spinner.style.display = 'block';
    } else if (type === 'success') {
      success.style.display = 'block';
    } else if (type === 'error') {
      error.style.display = 'block';
    }
    popup.classList.add('show');
    if (type === 'success' || type === 'error') {
      setTimeout(hidePopup, 3000);
    }
  }
  function hidePopup() {
    document.getElementById('customPopup').classList.remove('show');
  }
  function updatePopup(type, message) {
    const spinner = document.getElementById('popupSpinner');
    const success = document.getElementById('popupSuccess');
    const error = document.getElementById('popupError');
    const messageEl = document.getElementById('popupMessage');
    spinner.style.display = 'none';
    success.style.display = 'none';
    error.style.display = 'none';
    messageEl.textContent = message;
    if (type === 'success') {
      success.style.display = 'block';
    } else if (type === 'error') {
      error.style.display = 'block';
    }
    setTimeout(hidePopup, 3000);
  }

  // Test Supabase connection
  async function testConnection() {
    try {
      const { error } = await supabase.from('maintenance_records').select('count', { count: 'exact' });
      return !error;
    } catch {
      return false;
    }
  }

  // Navigation
  const navButtons = document.querySelectorAll('.desktop-nav li button, .mobile-nav-list li button');
  const navItems = document.querySelectorAll('.desktop-nav li, .mobile-nav-list li');
  const sections = document.querySelectorAll('main section');
  const mobileToggle = document.getElementById('mobileToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileOverlay = document.getElementById('mobileOverlay');

  function setActiveSection(section) {
    navItems.forEach(nav => nav.classList.remove('active'));
    navButtons.forEach(btn => btn.removeAttribute('aria-current'));
    document.querySelectorAll(`[data-section="${section}"]`).forEach(nav => {
      nav.classList.add('active');
      const btn = nav.querySelector('button');
      if (btn) btn.setAttribute('aria-current', 'page');
    });
    sections.forEach(sec => sec.classList.remove('active'));
    document.getElementById(section).classList.add('active');
    closeMobileMenu();
  }
  navButtons.forEach(button => {
    button.addEventListener('click', e => {
      e.preventDefault();
      setActiveSection(button.closest('li').dataset.section);
    });
    button.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setActiveSection(button.closest('li').dataset.section);
      }
    });
  });
  function openMobileMenu() {
    mobileToggle.classList.add('active');
    mobileMenu.classList.add('show');
    mobileOverlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  function closeMobileMenu() {
    mobileToggle.classList.remove('active');
    mobileMenu.classList.remove('show');
    mobileOverlay.classList.remove('show');
    document.body.style.overflow = '';
  }
  mobileToggle.addEventListener('click', e => {
    e.preventDefault();
    mobileMenu.classList.contains('show') ? closeMobileMenu() : openMobileMenu();
  });
  mobileOverlay.addEventListener('click', e => {
    e.preventDefault();
    closeMobileMenu();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && mobileMenu.classList.contains('show')) {
      closeMobileMenu();
    }
  });

  // Status badges
  document.querySelectorAll('.status[data-due]').forEach(el => {
    const due = el.getAttribute('data-due');
    if (!due) return;
    const [y, m, d] = due.split('-').map(Number);
    const dueDate = new Date(y, m - 1, d, 23, 59, 59);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diff = Math.ceil((dueDate - today) / 86400000);
    const formatted = due.split('-').reverse().join('-');
    if (diff < 0) {
      el.textContent = 'Expired on ' + formatted;
      el.classList.add('expired');
    } else if (diff <= 30) {
      el.textContent = `Expiring in ${diff} day${diff === 1 ? '' : 's'} (${formatted})`;
      el.classList.add('expiring');
    } else {
      el.textContent = 'Active until ' + formatted;
      el.classList.remove('expired', 'expiring');
    }
  });

  // Hide Next Due for Mods/Updates
  document.getElementById('serviceType').addEventListener('change', function() {
    const lbl = document.getElementById('nextDueLabel');
    if (this.value === 'Mods/Updates') {
      lbl.style.display = 'none';
      lbl.querySelector('input').value = '';
    } else {
      lbl.style.display = '';
    }
  });

  // Service entries store
  let serviceEntries = [];

  // Update home odometer & service info
function updateHomeServiceInfo() {
  // only real service entries
  const serviceOnly = serviceEntries
    .filter(e => e.type !== 'Mods/Updates')
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!serviceOnly.length) return;

  // EXCLUDE Mods/Updates from odo too:
  const maxOdo = Math.max(...serviceOnly.map(e => e.odo || 0));

  const latest = serviceOnly[0];
  const lastDate = new Date(latest.date).toLocaleDateString('en-GB');
  const nextDate = latest.next_due
    ? new Date(latest.next_due).toLocaleDateString('en-GB')
    : 'Not scheduled';

  document.getElementById('home-odo').innerHTML  = `<strong>Odometer:</strong><br/>${maxOdo} km`;
  document.getElementById('home-odo-mobile').innerHTML = `<strong>Odometer:</strong><br>${maxOdo} km`;
  document.getElementById('home-last').innerHTML = `<strong>Last Service:</strong><br/>${lastDate}`;
  document.getElementById('home-last-mobile').innerHTML = `<strong>Last Service:</strong><br>${lastDate}`;
  document.getElementById('home-next').innerHTML = `<strong>Next Service:</strong><br/>${nextDate}`;
  document.getElementById('home-next-mobile').innerHTML = `<strong>Next Service:</strong><br>${nextDate}`;
}


  // Render service history table
  function renderServiceTable() {
  const tbody = document.getElementById('serviceTableBody');
  tbody.innerHTML = '';

  if (!serviceEntries.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#666;">No service records found</td></tr>';
    return;
  }

  serviceEntries.forEach(entry => {
    // build all seven cells with a data-label
    const cells = [
      `<td data-label="Type">${entry.type || '-'}</td>`,
      `<td data-label="Date">${entry.date || '-'}</td>`,
      `<td data-label="Next Due">${entry.next_due || '-'}</td>`,
      `<td data-label="Odo (km)">${entry.odo || '-'}</td>`,
      `<td data-label="Cost (₹)">${entry.cost || '-'}</td>`,
      `<td data-label="Notes">${entry.notes || '-'}</td>`,
      `<td data-label="Bill" style="text-align:center;">${(() => {
        if (!entry.bill) return '-';
        const isNew = /^\d{13}-/.test(entry.bill);
        const publicUrl = isNew ? getBillFileUrl(entry.bill) : null;
        const name = isNew ? entry.bill.slice(14) : entry.bill;
        const ext  = name.split('.').pop().toLowerCase();
        let icon = '📄';
        if (['jpg','jpeg','png','gif','webp','bmp','tiff','svg','heic','heif'].includes(ext)) icon='🖼️';
        else if (ext === 'pdf') icon='📋';
        return publicUrl
          ? `<a href="${publicUrl}" target="_blank" rel="noopener noreferrer" title="${name}" style="font-size:18px;">${icon}</a>`
          : `<span title="${name}" style="font-size:18px;">${icon}</span>`;
      })()}</td>`
    ];

    const tr = document.createElement('tr');
    tr.innerHTML = cells.join('');
    tbody.appendChild(tr);
  });

  updateHomeServiceInfo();
}


  // Load entries from Supabase
  async function loadServiceEntries() {
    try {
      const { data, error } = await supabase
        .from('maintenance_records')
        .select('*')
        .order('date', { ascending: false });
      if (error) {
        showPopup('error', 'Could not load existing service records.');
        return;
      }
      serviceEntries = data || [];
      renderServiceTable();
    } catch {
      showPopup('error', 'Database connection failed.');
    }
  }

  // Form submission
  document.getElementById('serviceEntryForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    if (!data.get('type') || !data.get('date') || !data.get('odo') || !data.get('cost')) {
      showPopup('error', 'Please fill in all required fields.');
      return;
    }
    const file = data.get('bill');
    if (file && file.size > 0 && !validateFileUpload(file)) return;

    const entry = {
      type: data.get('type'),
      date: data.get('date'),
      nextDue: data.get('type') === 'Mods/Updates' ? '' : data.get('nextDue'),
      odo: data.get('odo'),
      cost: data.get('cost'),
      notes: data.get('notes')
    };

    const btn = form.querySelector('.drawer-submit');
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Saving...';
    showPopup('loading', 'Saving service entry...');

    // Save entry
    let saved = false;
    try {
      let billName = null;
      if (file && file.size > 0) {
        try { billName = await uploadBillFile(file); }
        catch {}
      }
      const insert = {
        type: entry.type,
        date: entry.date,
        next_due: entry.nextDue || null,
        odo: parseInt(entry.odo),
        cost: parseFloat(entry.cost),
        notes: entry.notes || null,
        bill: billName
      };
      const { data, error } = await supabase.from('maintenance_records').insert([insert]).select();
      if (error) {
        if (billName) await deleteBillFile(billName);
      } else {
        serviceEntries.unshift(data[0]);
        saved = true;
      }
    } catch {}
    
    if (saved) {
      renderServiceTable();
      form.reset();
      document.getElementById('nextDueLabel').style.display = '';
      const info = document.getElementById('fileInfo');
      if (info) info.innerHTML = '';
      updatePopup('success', 'Service entry saved successfully!');
    } else {
      updatePopup('error', 'Failed to save service entry.');
    }
    btn.disabled = false;
    btn.textContent = original;
  });

  // File validation
  function validateFileUpload(file) {
    const max = 5 * 1024 * 1024;
    const exts = ['.jpg','.jpeg','.png','.gif','.webp','.bmp','.tiff','.svg','.heic','.heif','.pdf'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!file.size)        { showPopup('error','No file selected'); return false; }
    if (file.size > max)   { showPopup('error',`File exceeds 5MB`); return false; }
    if (!exts.includes(ext)) {
      showPopup('error',`Invalid file type`); return false;
    }
    return true;
  }

  // Upload to Supabase Storage
  async function uploadBillFile(file) {
    const timestamp = Date.now();
    const clean = file.name.replace(/[^a-zA-Z0-9.\-_]/g,'_');
    const name = `${timestamp}-${clean}`;
    const buffer = await file.arrayBuffer();
    const ext = clean.split('.').pop().toLowerCase();
    const types = {
      pdf:'application/pdf', jpg:'image/jpeg', jpeg:'image/jpeg',
      png:'image/png', gif:'image/gif', webp:'image/webp',
      bmp:'image/bmp', tiff:'image/tiff', svg:'image/svg+xml',
      heic:'image/heic', heif:'image/heif'
    };
    const contentType = types[ext] || file.type || 'application/octet-stream';
    const { error } = await supabase.storage.from('service-bills').upload(name, buffer, {
      cacheControl:'3600', upsert:false, contentType
    });
    if (error) throw error;
    return name;
  }

  // Get public URL
  function getBillFileUrl(fileName) {
    return supabase.storage.from('service-bills').getPublicUrl(fileName).data.publicUrl;
  }

  // Delete file
  async function deleteBillFile(fileName) {
    await supabase.storage.from('service-bills').remove([fileName]);
  }

  // File input setup
  function setupFileInput() {
    const input = document.querySelector('input[name="bill"]');
    if (!input) return;
    input.setAttribute('accept','image/*,application/pdf,.pdf');
    input.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) {
        const info = document.getElementById('fileInfo');
        if (info) info.innerHTML = '';
        return;
      }
      if (!validateFileUpload(file)) {
        e.target.value = '';
        return;
      }
      let info = document.getElementById('fileInfo');
      if (!info) info = createFileInfoElement();
      const size = file.size < 1024*1024
        ? `${(file.size/1024).toFixed(1)} KB`
        : `${(file.size/(1024*1024)).toFixed(1)} MB`;
      const ext = file.name.split('.').pop().toLowerCase();
      let icon = '📄';
      if (['jpg','jpeg','png','gif','webp','bmp','tiff','svg','heic','heif'].includes(ext)) icon = '🖼️';
      else if (ext === 'pdf') icon = '📋';
      info.innerHTML = `<div style="color:#28a745;font-size:14px;margin-top:5px;">
        ${icon} Selected: <strong>${file.name}</strong> (${size})
      </div>`;
    });
  }
  function createFileInfoElement() {
    const input = document.querySelector('input[name="bill"]');
    const div = document.createElement('div');
    div.id = 'fileInfo';
    input.parentNode.insertBefore(div, input.nextSibling);
    return div;
  }

  // Initialize app
  async function initApp() {
    setupFileInput();
    const ok = await testConnection();
    if (ok) {
      await loadServiceEntries();
    } else {
      showPopup('error','Could not connect to database. Some features may not work.');
      renderServiceTable();
    }
  }
  initApp();
});
