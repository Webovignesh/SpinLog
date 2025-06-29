document.addEventListener('DOMContentLoaded', function() {
  // Select all nav buttons
  const navButtons = document.querySelectorAll('.desktop-nav li button, .mobile-nav-list li button');
  const navItems = document.querySelectorAll('.desktop-nav li, .mobile-nav-list li');
  const sections = document.querySelectorAll('main section');
  const mobileToggle = document.getElementById('mobileToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileOverlay = document.getElementById('mobileOverlay');

  // Helper to update active nav and section
  function setActiveSection(section) {
    navItems.forEach(nav => nav.classList.remove('active'));
    navButtons.forEach(btn => btn.removeAttribute('aria-current'));
    document.querySelectorAll(`[data-section="${section}"]`).forEach(nav => {
      nav.classList.add('active');
      const btn = nav.querySelector('button');
      if (btn) btn.setAttribute('aria-current', 'page');
    });
    sections.forEach(sec => sec.classList.remove('active'));
    const targetSection = document.getElementById(section);
    if (targetSection) targetSection.classList.add('active');
    closeMobileMenu();
  }

  // Event for clicks
  navButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const section = this.closest('li').dataset.section;
      setActiveSection(section);
    });
    // Keyboard support
    button.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const section = this.closest('li').dataset.section;
        setActiveSection(section);
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
  mobileToggle.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    if (mobileMenu.classList.contains('show')) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  });
  mobileOverlay.addEventListener('click', function(e) {
    e.preventDefault();
    closeMobileMenu();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && mobileMenu.classList.contains('show')) {
      closeMobileMenu();
    }
  });

  // Status badge logic
  const statusElements = document.querySelectorAll('.status[data-due]');
  statusElements.forEach(el => {
    const dueStr = el.getAttribute('data-due');
    if (!dueStr) return;
    const [year, month, day] = dueStr.split('-').map(Number);
    const dueDate = new Date(year, month - 1, day, 23, 59, 59);
    const today = new Date();
    today.setHours(0,0,0,0); // Midnight today
    const diff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    const formatted = dueStr.split('-').reverse().join('-');
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

// SpinLog v1.7.0 | service.js

// If you ever switch away from google.script.run, you can point this to your Apps Script exec URL:
const API_URL = 'https://script.google.com/macros/s/AKfycbzT9wwNM-M3SHJf7lpvmXZ1oS0XbCb2i5UzPxEu58hAYfPZss3-betv1HWduxA-GPV6/exec'; 

window.addEventListener('DOMContentLoaded', initServiceSection);

function initServiceSection() {
  // 1) Toggle Next-Due field
  document.getElementById('serviceType')
    .addEventListener('change', onTypeChange);

  // 2) Hook form submit
  document.getElementById('serviceEntryForm')
    .addEventListener('submit', onFormSubmit);

  // 3) Load existing records
  loadRecords();
}

function onTypeChange(e) {
  const lb = document.getElementById('nextDueLabel');
  if (e.target.value === 'Mods/Updates') {
    lb.style.display = 'none';
    lb.querySelector('input').value = '';
  } else {
    lb.style.display = '';
  }
}

function loadRecords() {
  // If we're running inside Apps Script's sandbox, use google.script.run
  if (window.google && google.script && google.script.run) {
    google.script
      .run
      .withFailureHandler(err => console.error('GS run error:', err))
      .withSuccessHandler(values => renderSheetValues(values))
      .getServiceRecords();
  } else {
    // Otherwise, fallback to fetch from your Web App URL
    fetch(API_URL)
      .then(r => r.json())
      .then(values => renderSheetValues(values))
      .catch(err => console.error('Fetch error:', err));
  }
}

// values: either a 2D array from getServiceRecords() or JSON from Apps Script
function renderSheetValues(values) {
  console.log('sheet values:', values);
  const tbody = document.getElementById('serviceTableBody');
  if (!tbody) return;              // if table removed from UI, skip
  tbody.innerHTML = '';            // clear existing

  if (!Array.isArray(values) || values.length < 2) return;

  const rows = values.slice(1);    // drop header row
  rows.forEach(r => {
    if (!r[1]) return;             // skip blank type
    const entry = {
      type:    r[1],
      date:    r[2],
      nextDue: r[3],
      odo:     r[4],
      cost:    r[5],
      notes:   r[6],
      bill:    r[7]
    };
    addEntryToTable(entry);
  });
}

function onFormSubmit(e) {
  e.preventDefault();
  const fm = e.target;
  const fd = new FormData(fm);
  const billFile = fd.get('bill');
  const billName = billFile && billFile.name ? billFile.name : '';

  const entry = {
    type:    fd.get('type'),
    date:    fd.get('date'),
    nextDue: fd.get('type') === 'Mods/Updates' ? '' : fd.get('nextDue'),
    odo:     fd.get('odo'),
    cost:    fd.get('cost'),
    notes:   fd.get('notes'),
    bill:    billName
  };

  if (window.google && google.script && google.script.run) {
    // Apps Script call
    google.script
      .run
      .withSuccessHandler(res => {
        if (res.status === 'success') {
          addEntryToTable(entry);
          fm.reset();
          document.getElementById('nextDueLabel').style.display = '';
        } else {
          alert('Save failed: ' + (res.message || 'Unknown'));
        }
      })
      .addServiceRecord(entry);
  } else {
    // Fetch fallback
    fetch(API_URL, {
      method:  'POST',
      headers: {'Content-Type':'application/json'},
      body:    JSON.stringify(entry)
    })
    .then(r => r.json())
    .then(res => {
      if (res.status === 'success') {
        addEntryToTable(entry);
        fm.reset();
        document.getElementById('nextDueLabel').style.display = '';
      } else {
        alert('Save failed: ' + (res.message || 'Unknown'));
      }
    })
    .catch(err => {
      console.error('Network error:', err);
      alert('Could not save record.');
    });
  }
}

function addEntryToTable(en) {
  const tb = document.getElementById('serviceTableBody');
  if (!tb) return;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${en.type}</td>
    <td>${en.date || ''}</td>
    <td>${en.nextDue || '-'}</td>
    <td>${en.odo || ''}</td>
    <td>${en.cost || ''}</td>
    <td>${en.notes || ''}</td>
    <td>${en.bill ? '<span>'+en.bill+'</span>' : '-'}</td>
  `;
  tb.appendChild(tr);
}

});
