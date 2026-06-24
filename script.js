// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDEN8J1QU1-T8o-X0QF_NdfKqpPSmFvAxY",
    authDomain: "village-laos.firebaseapp.com",
    projectId: "village-laos",
    storageBucket: "village-laos.firebasestorage.app",
    messagingSenderId: "522422295381",
    appId: "1:522422295381:web:cf160b9aad2a18f77d2ddc"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Global variables
let currentUser = null;
let currentPage = 'user-search';
let provinces = [];
let districts = [];
let groupVillages = [];   // ກຸ່ມບ້ານ
let villages = [];
let searchTimeout = null;

// Filtered data storage
let currentFilteredVillages = [];
let currentFilteredProvinces = [];
let currentFilteredDistricts = [];
let currentFilteredGroupVillages = [];
let currentFilteredVillagesAdmin = [];

// DOM elements
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const navLinks = document.querySelectorAll('.nav-link');
const pageSections = document.querySelectorAll('.page-section');
const loginSection = document.getElementById('login-section');
const loginForm = document.getElementById('login-form');
const loginAlert = document.getElementById('login-alert');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initApp();
    setupEventListeners();
    loadInitialData();
});

function initApp() {
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loginBtn.classList.add('hidden');
            logoutBtn.classList.remove('hidden');
            showAdminSections();
        } else {
            currentUser = null;
            loginBtn.classList.remove('hidden');
            logoutBtn.classList.add('hidden');
            hideAdminSections();
        }
    });
}

function setupEventListeners() {
    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            showPage(page);
        });
    });

    // Authentication
    loginBtn.addEventListener('click', function() {
        showPage('login-section');
    });

    logoutBtn.addEventListener('click', function() {
        auth.signOut();
        showPage('user-search');
    });

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                showPage('province-management');
                loginAlert.classList.add('hidden');
            })
            .catch(error => {
                loginAlert.textContent = error.message;
                loginAlert.classList.remove('hidden');
            });
    });

    // Modal close controls
    document.querySelectorAll('.close-btn, .close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });

    // Add buttons
    document.getElementById('add-province-btn').addEventListener('click', function() {
        showProvinceModal();
    });
    document.getElementById('add-district-btn').addEventListener('click', function() {
        showDistrictModal();
    });
    document.getElementById('add-group-village-btn').addEventListener('click', function() {
        showGroupVillageModal();
    });
    document.getElementById('add-village-btn').addEventListener('click', function() {
        showVillageModal();
    });

    // Auto ID buttons
    document.getElementById('auto-province-id').addEventListener('click', function() {
        generateAutoProvinceId();
    });
    document.getElementById('auto-district-id').addEventListener('click', function() {
        generateAutoDistrictId();
    });
    document.getElementById('auto-group-village-id').addEventListener('click', function() {
        generateAutoGroupVillageId();
    });
    document.getElementById('auto-village-id').addEventListener('click', function() {
        generateAutoVillageId();
    });

    // Form submissions
    document.getElementById('province-form').addEventListener('submit', function(e) {
        e.preventDefault();
        saveProvince();
    });
    document.getElementById('district-form').addEventListener('submit', function(e) {
        e.preventDefault();
        saveDistrict();
    });
    document.getElementById('group-village-form').addEventListener('submit', function(e) {
        e.preventDefault();
        saveGroupVillage();
    });
    document.getElementById('village-form').addEventListener('submit', function(e) {
        e.preventDefault();
        saveVillage();
    });

    // Real-time search
    document.getElementById('village-search').addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => { filterVillages(); }, 300);
    });
    document.getElementById('province-search').addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => { filterProvinces(); }, 300);
    });
    document.getElementById('district-search').addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => { filterDistricts(); }, 300);
    });
    document.getElementById('group-village-search').addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => { filterGroupVillages(); }, 300);
    });
    document.getElementById('village-admin-search').addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => { filterVillagesAdmin(); }, 300);
    });

    // Province / district / group-village cascade filters
    document.getElementById('province-filter').addEventListener('change', function() {
        updateDistrictFilter();
        updateGroupVillageFilter();
        filterVillages();
    });
    document.getElementById('district-filter').addEventListener('change', function() {
        updateGroupVillageFilter();
        filterVillages();
    });
    document.getElementById('group-village-filter').addEventListener('change', function() {
        filterVillages();
    });

    // Group-village modal cascade: province → district
    document.getElementById('group-village-province').addEventListener('change', function() {
        updateGroupVillageModalDistrictFilter(this.value);
    });

    // Village modal cascades
    document.getElementById('village-province').addEventListener('change', function() {
        updateVillageDistrictFilter(this.value);
        updateVillageGroupFilter(null); // clear group when province changes
    });
    document.getElementById('village-district').addEventListener('change', function() {
        updateVillageGroupFilter(this.value);
    });

    // Pagination
    document.getElementById('prev-page').addEventListener('click', function() {
        navigatePage('prev', 'village');
    });
    document.getElementById('next-page').addEventListener('click', function() {
        navigatePage('next', 'village');
    });
    document.getElementById('prev-page-province').addEventListener('click', function() {
        navigatePage('prev', 'province');
    });
    document.getElementById('next-page-province').addEventListener('click', function() {
        navigatePage('next', 'province');
    });
    document.getElementById('prev-page-district').addEventListener('click', function() {
        navigatePage('prev', 'district');
    });
    document.getElementById('next-page-district').addEventListener('click', function() {
        navigatePage('next', 'district');
    });
    document.getElementById('prev-page-group-village').addEventListener('click', function() {
        navigatePage('prev', 'group-village');
    });
    document.getElementById('next-page-group-village').addEventListener('click', function() {
        navigatePage('next', 'group-village');
    });
    document.getElementById('prev-page-village').addEventListener('click', function() {
        navigatePage('prev', 'village-admin');
    });
    document.getElementById('next-page-village').addEventListener('click', function() {
        navigatePage('next', 'village-admin');
    });
}

// ─── Page navigation ────────────────────────────────────────────────────────

function showPage(page) {
    pageSections.forEach(section => section.classList.add('hidden'));
    document.getElementById(page).classList.remove('hidden');

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === page) {
            link.classList.add('active');
        }
    });

    currentPage = page;

    switch(page) {
        case 'user-search':          displayVillages();       break;
        case 'province-management':  displayProvinces();      break;
        case 'district-management':  displayDistricts();      break;
        case 'group-village-management': displayGroupVillages(); break;
        case 'village-management':   displayVillagesAdmin();  break;
    }
}

function showAdminSections() {
    navLinks.forEach(link => {
        if (link.getAttribute('data-page') !== 'user-search') {
            link.style.display = 'block';
        }
    });
}

function hideAdminSections() {
    navLinks.forEach(link => {
        if (link.getAttribute('data-page') !== 'user-search') {
            link.style.display = 'none';
        }
    });
    if (currentPage !== 'user-search' && currentPage !== 'login-section') {
        showPage('user-search');
    }
}

// ─── Data loading ────────────────────────────────────────────────────────────

function loadInitialData() {
    loadProvinces();
    loadDistricts();
    loadGroupVillages();
    loadVillages();
}

function loadProvinces() {
    db.collection('provinces').orderBy('pr_id').get()
        .then(snapshot => {
            provinces = [];
            snapshot.forEach(doc => provinces.push({ id: doc.id, ...doc.data() }));
            currentFilteredProvinces = [];
            populateProvinceFilters();
            if (currentPage === 'province-management') displayProvinces();
        })
        .catch(error => console.error('ຂໍ້ຜິດໃນການໂຫຼດຂໍ້ມູນແຂວງ:', error));
}

function loadDistricts() {
    db.collection('districts').orderBy('di_id').get()
        .then(snapshot => {
            districts = [];
            snapshot.forEach(doc => districts.push({ id: doc.id, ...doc.data() }));
            currentFilteredDistricts = [];
            populateDistrictFilters();
            if (currentPage === 'district-management') displayDistricts();
        })
        .catch(error => console.error('ຂໍ້ຜິດພາດໃນການໂຫຼດຂໍ້ມູນເມືອງ:', error));
}

function loadGroupVillages() {
    db.collection('group_villages').orderBy('gr_id').get()
        .then(snapshot => {
            groupVillages = [];
            snapshot.forEach(doc => groupVillages.push({ id: doc.id, ...doc.data() }));
            currentFilteredGroupVillages = [];
            populateGroupVillageFilters();
            if (currentPage === 'group-village-management') displayGroupVillages();
        })
        .catch(error => console.error('ຂໍ້ຜິດພາດໃນການໂຫຼດຂໍ້ມູນກຸ່ມບ້ານ:', error));
}

function loadVillages() {
    db.collection('villages').orderBy('vill_id').get()
        .then(snapshot => {
            villages = [];
            snapshot.forEach(doc => villages.push({ id: doc.id, ...doc.data() }));
            currentFilteredVillages = [];
            currentFilteredVillagesAdmin = [];
            if (currentPage === 'village-management') displayVillagesAdmin();
            else if (currentPage === 'user-search') displayVillages();
        })
        .catch(error => console.error('ຂໍ້ຜິດພາດໃນການໂຫຼດຂໍ້ມູນບ້ານ:', error));
}

// ─── Populate selects ────────────────────────────────────────────────────────

function populateProvinceFilters() {
    const provinceFilter      = document.getElementById('province-filter');
    const districtProvince    = document.getElementById('district-province');
    const groupVillageProvince = document.getElementById('group-village-province');
    const villageProvince     = document.getElementById('village-province');

    [provinceFilter, districtProvince, groupVillageProvince, villageProvince].forEach(sel => {
        while (sel.children.length > 1) sel.removeChild(sel.lastChild);
    });

    provinces.forEach(province => {
        const opt = document.createElement('option');
        opt.value = province.pr_id;
        opt.textContent = province.pr_name;
        provinceFilter.appendChild(opt.cloneNode(true));
        districtProvince.appendChild(opt.cloneNode(true));
        groupVillageProvince.appendChild(opt.cloneNode(true));
        villageProvince.appendChild(opt);
    });
}

function populateDistrictFilters() {
    const districtFilter  = document.getElementById('district-filter');
    const villageDistrict = document.getElementById('village-district');

    [districtFilter, villageDistrict].forEach(sel => {
        while (sel.children.length > 1) sel.removeChild(sel.lastChild);
    });

    districts.forEach(district => {
        const opt = document.createElement('option');
        opt.value = district.di_id;
        opt.textContent = district.di_name;
        districtFilter.appendChild(opt.cloneNode(true));
        villageDistrict.appendChild(opt);
    });
}

function populateGroupVillageFilters() {
    const gvFilter = document.getElementById('group-village-filter');
    const villageGroup = document.getElementById('village-group');

    [gvFilter, villageGroup].forEach(sel => {
        while (sel.children.length > 1) sel.removeChild(sel.lastChild);
    });

    groupVillages.forEach(gv => {
        const opt = document.createElement('option');
        opt.value = gv.gr_id;
        opt.textContent = gv.gr_name;
        gvFilter.appendChild(opt.cloneNode(true));
        villageGroup.appendChild(opt);
    });
}

// ─── Cascade filter updaters ─────────────────────────────────────────────────

function updateDistrictFilter() {
    const provinceId = document.getElementById('province-filter').value;
    const districtFilter = document.getElementById('district-filter');
    while (districtFilter.children.length > 1) districtFilter.removeChild(districtFilter.lastChild);
    if (provinceId) {
        districts.filter(d => d.pr_id == provinceId).forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.di_id;
            opt.textContent = d.di_name;
            districtFilter.appendChild(opt);
        });
    }
}

function updateGroupVillageFilter() {
    const districtId = document.getElementById('district-filter').value;
    const gvFilter   = document.getElementById('group-village-filter');
    while (gvFilter.children.length > 1) gvFilter.removeChild(gvFilter.lastChild);
    groupVillages
        .filter(gv => !districtId || gv.di_id == districtId)
        .forEach(gv => {
            const opt = document.createElement('option');
            opt.value = gv.gr_id;
            opt.textContent = gv.gr_name;
            gvFilter.appendChild(opt);
        });
}

function updateVillageDistrictFilter(provinceId) {
    const villageDistrict = document.getElementById('village-district');
    while (villageDistrict.children.length > 1) villageDistrict.removeChild(villageDistrict.lastChild);
    districts.filter(d => d.pr_id == provinceId).forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.di_id;
        opt.textContent = d.di_name;
        villageDistrict.appendChild(opt);
    });
}

function updateVillageGroupFilter(districtId) {
    const villageGroup = document.getElementById('village-group');
    while (villageGroup.children.length > 1) villageGroup.removeChild(villageGroup.lastChild);
    groupVillages
        .filter(gv => !districtId || gv.di_id == districtId)
        .forEach(gv => {
            const opt = document.createElement('option');
            opt.value = gv.gr_id;
            opt.textContent = gv.gr_name;
            villageGroup.appendChild(opt);
        });
}

function updateGroupVillageModalDistrictFilter(provinceId) {
    const gvDistrict = document.getElementById('group-village-district');
    while (gvDistrict.children.length > 1) gvDistrict.removeChild(gvDistrict.lastChild);
    if (!provinceId) {
        gvDistrict.options[0].textContent = 'ເລືອກແຂວງກ່ອນ';
        return;
    }
    gvDistrict.options[0].textContent = 'ເລືອກເມືອງ';
    districts.filter(d => d.pr_id == provinceId).forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.di_id;
        opt.textContent = d.di_name;
        gvDistrict.appendChild(opt);
    });
}

// ─── Filter functions ─────────────────────────────────────────────────────────

function filterVillages() {
    const provinceId   = document.getElementById('province-filter').value;
    const districtId   = document.getElementById('district-filter').value;
    const groupId      = document.getElementById('group-village-filter').value;
    const searchTerm   = document.getElementById('village-search').value.toLowerCase();

    let filtered = villages;

    if (provinceId) {
        filtered = filtered.filter(v => {
            const d = districts.find(d => d.di_id == v.di_id);
            return d && d.pr_id == provinceId;
        });
    }
    if (districtId) {
        filtered = filtered.filter(v => v.di_id == districtId);
    }
    if (groupId) {
        filtered = filtered.filter(v => v.gr_id == groupId);
    }
    if (searchTerm) {
        filtered = filtered.filter(v =>
            v.vill_name.toLowerCase().includes(searchTerm) ||
            (v.vill_name_en && v.vill_name_en.toLowerCase().includes(searchTerm))
        );
    }

    currentFilteredVillages = filtered;
    document.getElementById('current-page').textContent = 1;
    displayVillages(currentFilteredVillages);
}

function filterProvinces() {
    const searchTerm = document.getElementById('province-search').value.toLowerCase();
    currentFilteredProvinces = provinces.filter(p =>
        p.pr_name.toLowerCase().includes(searchTerm) ||
        (p.pr_name_en && p.pr_name_en.toLowerCase().includes(searchTerm))
    );
    document.getElementById('current-page-province').textContent = 1;
    displayProvinces(currentFilteredProvinces);
}

function filterDistricts() {
    const searchTerm = document.getElementById('district-search').value.toLowerCase();
    currentFilteredDistricts = districts.filter(d =>
        d.di_name.toLowerCase().includes(searchTerm) ||
        (d.di_name_en && d.di_name_en.toLowerCase().includes(searchTerm))
    );
    document.getElementById('current-page-district').textContent = 1;
    displayDistricts(currentFilteredDistricts);
}

function filterGroupVillages() {
    const searchTerm = document.getElementById('group-village-search').value.toLowerCase();
    currentFilteredGroupVillages = groupVillages.filter(gv =>
        gv.gr_name.toLowerCase().includes(searchTerm)
    );
    document.getElementById('current-page-group-village').textContent = 1;
    displayGroupVillages(currentFilteredGroupVillages);
}

function filterVillagesAdmin() {
    const searchTerm = document.getElementById('village-admin-search').value.toLowerCase();
    currentFilteredVillagesAdmin = villages.filter(v =>
        v.vill_name.toLowerCase().includes(searchTerm) ||
        (v.vill_name_en && v.vill_name_en.toLowerCase().includes(searchTerm))
    );
    document.getElementById('current-page-village').textContent = 1;
    displayVillagesAdmin(currentFilteredVillagesAdmin);
}

// ─── Display functions ────────────────────────────────────────────────────────

function displayVillages(villageList = null) {
    const tableBody = document.getElementById('village-table-body');
    tableBody.innerHTML = '';

    let displayList = villageList || (currentFilteredVillages.length > 0 ? currentFilteredVillages : villages);

    if (displayList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">ບໍ່ພົບຂໍ້ມູນບ້ານ</td></tr>`;
        return;
    }

    const pageSize = 10;
    const currentPageNum = parseInt(document.getElementById('current-page').textContent) || 1;
    const paginatedVillages = displayList.slice((currentPageNum - 1) * pageSize, currentPageNum * pageSize);
    const totalPages = Math.ceil(displayList.length / pageSize);
    document.getElementById('total-pages').textContent = totalPages;

    paginatedVillages.forEach(village => {
        const district = districts.find(d => d.di_id == village.di_id);
        const province = district ? provinces.find(p => p.pr_id == district.pr_id) : null;
        const group    = village.gr_id ? groupVillages.find(gv => gv.gr_id == village.gr_id) : null;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${village.vill_name}</td>
            <td>${village.vill_name_en || '-'}</td>
            <td>${group ? group.gr_name : '-'}</td>
            <td>${district ? district.di_name : 'Unknown'}</td>
            <td>${province ? province.pr_name : 'Unknown'}</td>
        `;
        tableBody.appendChild(row);
    });

    document.getElementById('prev-page').disabled = currentPageNum <= 1;
    document.getElementById('next-page').disabled = currentPageNum >= totalPages;
}

function displayProvinces(provinceList = null) {
    const tableBody = document.getElementById('province-table-body');
    tableBody.innerHTML = '';

    let displayList = provinceList || (currentFilteredProvinces.length > 0 ? currentFilteredProvinces : provinces);

    if (displayList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">ບໍ່ພົບຂໍ້ມູນແຂວງ</td></tr>`;
        return;
    }

    const pageSize = 10;
    const currentPageNum = parseInt(document.getElementById('current-page-province').textContent) || 1;
    const paginated = displayList.slice((currentPageNum - 1) * pageSize, currentPageNum * pageSize);
    const totalPages = Math.ceil(displayList.length / pageSize);
    document.getElementById('total-pages-province').textContent = totalPages;

    paginated.forEach(province => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${province.pr_id}</td>
            <td>${province.pr_name}</td>
            <td>${province.pr_name_en || '-'}</td>
            <td class="action-buttons">
                <button class="action-btn btn-warning edit-province" data-id="${province.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn btn-danger delete-province" data-id="${province.id}"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    document.getElementById('prev-page-province').disabled = currentPageNum <= 1;
    document.getElementById('next-page-province').disabled = currentPageNum >= totalPages;

    tableBody.querySelectorAll('.edit-province').forEach(btn => {
        btn.addEventListener('click', () => editProvince(btn.getAttribute('data-id')));
    });
    tableBody.querySelectorAll('.delete-province').forEach(btn => {
        btn.addEventListener('click', () => deleteProvince(btn.getAttribute('data-id')));
    });
}

function displayDistricts(districtList = null) {
    const tableBody = document.getElementById('district-table-body');
    tableBody.innerHTML = '';

    let displayList = districtList || (currentFilteredDistricts.length > 0 ? currentFilteredDistricts : districts);

    if (displayList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">ບໍ່ພົບຂໍ້ມູນເມືອງ</td></tr>`;
        return;
    }

    const pageSize = 10;
    const currentPageNum = parseInt(document.getElementById('current-page-district').textContent) || 1;
    const paginated = displayList.slice((currentPageNum - 1) * pageSize, currentPageNum * pageSize);
    const totalPages = Math.ceil(displayList.length / pageSize);
    document.getElementById('total-pages-district').textContent = totalPages;

    paginated.forEach(district => {
        const province = provinces.find(p => p.pr_id == district.pr_id);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${district.di_id}</td>
            <td>${district.di_name}</td>
            <td>${district.di_name_en || '-'}</td>
            <td>${province ? province.pr_name : 'Unknown'}</td>
            <td class="action-buttons">
                <button class="action-btn btn-warning edit-district" data-id="${district.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn btn-danger delete-district" data-id="${district.id}"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    document.getElementById('prev-page-district').disabled = currentPageNum <= 1;
    document.getElementById('next-page-district').disabled = currentPageNum >= totalPages;

    tableBody.querySelectorAll('.edit-district').forEach(btn => {
        btn.addEventListener('click', () => editDistrict(btn.getAttribute('data-id')));
    });
    tableBody.querySelectorAll('.delete-district').forEach(btn => {
        btn.addEventListener('click', () => deleteDistrict(btn.getAttribute('data-id')));
    });
}

function displayGroupVillages(gvList = null) {
    const tableBody = document.getElementById('group-village-table-body');
    tableBody.innerHTML = '';

    let displayList = gvList || (currentFilteredGroupVillages.length > 0 ? currentFilteredGroupVillages : groupVillages);

    if (displayList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">ບໍ່ພົບຂໍ້ມູນກຸ່ມບ້ານ</td></tr>`;
        return;
    }

    const pageSize = 10;
    const currentPageNum = parseInt(document.getElementById('current-page-group-village').textContent) || 1;
    const paginated = displayList.slice((currentPageNum - 1) * pageSize, currentPageNum * pageSize);
    const totalPages = Math.ceil(displayList.length / pageSize);
    document.getElementById('total-pages-group-village').textContent = totalPages;

    paginated.forEach(gv => {
        const district = districts.find(d => d.di_id == gv.di_id);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${gv.gr_id}</td>
            <td>${gv.gr_name}</td>
            <td>${district ? district.di_name : 'Unknown'}</td>
            <td class="action-buttons">
                <button class="action-btn btn-warning edit-group-village" data-id="${gv.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn btn-danger delete-group-village" data-id="${gv.id}"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    document.getElementById('prev-page-group-village').disabled = currentPageNum <= 1;
    document.getElementById('next-page-group-village').disabled = currentPageNum >= totalPages;

    tableBody.querySelectorAll('.edit-group-village').forEach(btn => {
        btn.addEventListener('click', () => editGroupVillage(btn.getAttribute('data-id')));
    });
    tableBody.querySelectorAll('.delete-group-village').forEach(btn => {
        btn.addEventListener('click', () => deleteGroupVillage(btn.getAttribute('data-id')));
    });
}

function displayVillagesAdmin(villageList = null) {
    const tableBody = document.getElementById('village-admin-table-body');
    tableBody.innerHTML = '';

    let displayList = villageList || (currentFilteredVillagesAdmin.length > 0 ? currentFilteredVillagesAdmin : villages);

    if (displayList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">ບໍ່ພົບຂໍ້ມູນບ້ານ</td></tr>`;
        return;
    }

    const pageSize = 10;
    const currentPageNum = parseInt(document.getElementById('current-page-village').textContent) || 1;
    const paginated = displayList.slice((currentPageNum - 1) * pageSize, currentPageNum * pageSize);
    const totalPages = Math.ceil(displayList.length / pageSize);
    document.getElementById('total-pages-village').textContent = totalPages;

    paginated.forEach(village => {
        const district = districts.find(d => d.di_id == village.di_id);
        const province = district ? provinces.find(p => p.pr_id == district.pr_id) : null;
        const group    = village.gr_id ? groupVillages.find(gv => gv.gr_id == village.gr_id) : null;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${village.vill_id}</td>
            <td>${village.vill_name}</td>
            <td>${village.vill_name_en || '-'}</td>
            <td>${group ? group.gr_name : '-'}</td>
            <td>${district ? district.di_name : 'Unknown'}</td>
            <td>${province ? province.pr_name : 'Unknown'}</td>
            <td class="action-buttons">
                <button class="action-btn btn-warning edit-village" data-id="${village.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn btn-danger delete-village" data-id="${village.id}"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    document.getElementById('prev-page-village').disabled = currentPageNum <= 1;
    document.getElementById('next-page-village').disabled = currentPageNum >= totalPages;

    tableBody.querySelectorAll('.edit-village').forEach(btn => {
        btn.addEventListener('click', () => editVillage(btn.getAttribute('data-id')));
    });
    tableBody.querySelectorAll('.delete-village').forEach(btn => {
        btn.addEventListener('click', () => deleteVillage(btn.getAttribute('data-id')));
    });
}

// ─── Modal display ────────────────────────────────────────────────────────────

function showProvinceModal(province = null) {
    const modal = document.getElementById('province-modal');
    const form  = document.getElementById('province-form');
    if (province) {
        document.getElementById('province-modal-title').textContent = 'ແກ້ໄຂແຂວງ';
        document.getElementById('province-id').value       = province.pr_id;
        document.getElementById('province-name').value     = province.pr_name;
        document.getElementById('province-name-en').value  = province.pr_name_en || '';
        form.setAttribute('data-id', province.id);
    } else {
        document.getElementById('province-modal-title').textContent = 'ເພີ່ມແຂວງ';
        form.reset();
        form.removeAttribute('data-id');
        generateAutoProvinceId();
    }
    modal.style.display = 'flex';
}

function showDistrictModal(district = null) {
    const modal = document.getElementById('district-modal');
    const form  = document.getElementById('district-form');
    if (district) {
        document.getElementById('district-modal-title').textContent = 'ແກ້ໄຂເມືອງ';
        document.getElementById('district-id').value       = district.di_id;
        document.getElementById('district-name').value     = district.di_name;
        document.getElementById('district-name-en').value  = district.di_name_en || '';
        document.getElementById('district-province').value = district.pr_id;
        form.setAttribute('data-id', district.id);
    } else {
        document.getElementById('district-modal-title').textContent = 'ເພີ່ມເມືອງ';
        form.reset();
        form.removeAttribute('data-id');
        generateAutoDistrictId();
    }
    modal.style.display = 'flex';
}

function showGroupVillageModal(gv = null) {
    const modal = document.getElementById('group-village-modal');
    const form  = document.getElementById('group-village-form');
    if (gv) {
        document.getElementById('group-village-modal-title').textContent = 'ແກ້ໄຂກຸ່ມບ້ານ';
        document.getElementById('group-village-id').value   = gv.gr_id;
        document.getElementById('group-village-name').value = gv.gr_name;

        // Find the province that owns this district, then cascade
        const district = districts.find(d => d.di_id == gv.di_id);
        if (district) {
            document.getElementById('group-village-province').value = district.pr_id;
            updateGroupVillageModalDistrictFilter(district.pr_id);
            document.getElementById('group-village-district').value = gv.di_id;
        }

        form.setAttribute('data-id', gv.id);
    } else {
        document.getElementById('group-village-modal-title').textContent = 'ເພີ່ມກຸ່ມບ້ານ';
        form.reset();
        // Reset district dropdown to placeholder state
        updateGroupVillageModalDistrictFilter(null);
        form.removeAttribute('data-id');
        generateAutoGroupVillageId();
    }
    modal.style.display = 'flex';
}

function showVillageModal(village = null) {
    const modal = document.getElementById('village-modal');
    const form  = document.getElementById('village-form');
    if (village) {
        document.getElementById('village-modal-title').textContent = 'ແກ້ໄຂບ້ານ';
        document.getElementById('village-id').value       = village.vill_id;
        document.getElementById('village-name').value     = village.vill_name;
        document.getElementById('village-name-en').value  = village.vill_name_en || '';

        const district = districts.find(d => d.di_id == village.di_id);
        if (district) {
            document.getElementById('village-province').value = district.pr_id;
            updateVillageDistrictFilter(district.pr_id);
            document.getElementById('village-district').value = village.di_id;
            updateVillageGroupFilter(village.di_id);
        }
        if (village.gr_id) {
            document.getElementById('village-group').value = village.gr_id;
        }

        form.setAttribute('data-id', village.id);
    } else {
        document.getElementById('village-modal-title').textContent = 'ເພີ່ມບ້ານ';
        form.reset();
        form.removeAttribute('data-id');
        // Reset group dropdown to full list
        updateVillageGroupFilter(null);
        generateAutoVillageId();
    }
    modal.style.display = 'flex';
}

// ─── Auto ID generators ───────────────────────────────────────────────────────

function generateAutoProvinceId() {
    const maxId = provinces.length === 0 ? 0 : Math.max(...provinces.map(p => p.pr_id));
    document.getElementById('province-id').value = maxId + 1;
}

function generateAutoDistrictId() {
    const maxId = districts.length === 0 ? 0 : Math.max(...districts.map(d => d.di_id));
    document.getElementById('district-id').value = maxId + 1;
}

function generateAutoGroupVillageId() {
    const maxId = groupVillages.length === 0 ? 0 : Math.max(...groupVillages.map(gv => gv.gr_id));
    document.getElementById('group-village-id').value = maxId + 1;
}

function generateAutoVillageId() {
    const maxId = villages.length === 0 ? 0 : Math.max(...villages.map(v => v.vill_id));
    document.getElementById('village-id').value = maxId + 1;
}

// ─── Save functions ───────────────────────────────────────────────────────────

function saveProvince() {
    const form       = document.getElementById('province-form');
    const provinceId = form.getAttribute('data-id');
    const data = {
        pr_id:     parseInt(document.getElementById('province-id').value),
        pr_name:   document.getElementById('province-name').value,
        pr_name_en: document.getElementById('province-name-en').value || null
    };

    const ref = db.collection('provinces');
    const op  = provinceId ? ref.doc(provinceId).update(data) : ref.add(data);
    op.then(() => {
        loadProvinces();
        document.getElementById('province-modal').style.display = 'none';
    }).catch(err => alert('ຂໍ້ຜິດພາດ: ' + err.message));
}

function saveDistrict() {
    const form       = document.getElementById('district-form');
    const districtId = form.getAttribute('data-id');
    const data = {
        di_id:     parseInt(document.getElementById('district-id').value),
        di_name:   document.getElementById('district-name').value,
        di_name_en: document.getElementById('district-name-en').value || null,
        pr_id:     parseInt(document.getElementById('district-province').value)
    };

    const ref = db.collection('districts');
    const op  = districtId ? ref.doc(districtId).update(data) : ref.add(data);
    op.then(() => {
        loadDistricts();
        document.getElementById('district-modal').style.display = 'none';
    }).catch(err => alert('ຂໍ້ຜິດພາດ: ' + err.message));
}

function saveGroupVillage() {
    const form = document.getElementById('group-village-form');
    const gvId = form.getAttribute('data-id');
    const data = {
        gr_id:   parseInt(document.getElementById('group-village-id').value),
        gr_name: document.getElementById('group-village-name').value,
        di_id:   parseInt(document.getElementById('group-village-district').value)
    };

    const ref = db.collection('group_villages');
    const op  = gvId ? ref.doc(gvId).update(data) : ref.add(data);
    op.then(() => {
        loadGroupVillages();
        document.getElementById('group-village-modal').style.display = 'none';
    }).catch(err => alert('ຂໍ້ຜິດພາດ: ' + err.message));
}

function saveVillage() {
    const form      = document.getElementById('village-form');
    const villageId = form.getAttribute('data-id');
    const grIdVal   = document.getElementById('village-group').value;
    const data = {
        vill_id:     parseInt(document.getElementById('village-id').value),
        vill_name:   document.getElementById('village-name').value,
        vill_name_en: document.getElementById('village-name-en').value || null,
        di_id:       parseInt(document.getElementById('village-district').value),
        gr_id:       grIdVal ? parseInt(grIdVal) : null
    };

    const ref = db.collection('villages');
    const op  = villageId ? ref.doc(villageId).update(data) : ref.add(data);
    op.then(() => {
        loadVillages();
        document.getElementById('village-modal').style.display = 'none';
    }).catch(err => alert('ຂໍ້ຜິດພາດ: ' + err.message));
}

// ─── Edit functions ───────────────────────────────────────────────────────────

function editProvince(provinceId) {
    const province = provinces.find(p => p.id === provinceId);
    if (province) showProvinceModal(province);
}

function editDistrict(districtId) {
    const district = districts.find(d => d.id === districtId);
    if (district) showDistrictModal(district);
}

function editGroupVillage(gvId) {
    const gv = groupVillages.find(g => g.id === gvId);
    if (gv) showGroupVillageModal(gv);
}

function editVillage(villageId) {
    const village = villages.find(v => v.id === villageId);
    if (village) showVillageModal(village);
}

// ─── Delete functions ─────────────────────────────────────────────────────────

function deleteProvince(provinceId) {
    if (confirm('ເຈົ້າແນ່ໃຈບໍ່ທີ່ຈະລົບແຂວງນີ້ອອກ? ມັນຈະລົບເມືອງ ແລະ ບ້ານທັງໝົດທີ່ຢູ່ໃນແຂວງນີ້.')) {
        db.collection('provinces').doc(provinceId).delete()
            .then(() => loadProvinces())
            .catch(err => alert('ຂໍ້ຜິດພາດ: ' + err.message));
    }
}

function deleteDistrict(districtId) {
    if (confirm('ເຈົ້າແນ່ໃຈບໍ່ທີ່ຈະລົບເມືອງນີ້ອອກ? ມັນຈະລົບບ້ານທັງໝົດທີ່ຢູ່ໃນເມືອງນີ້.')) {
        db.collection('districts').doc(districtId).delete()
            .then(() => loadDistricts())
            .catch(err => alert('ຂໍ້ຜິດພາດ: ' + err.message));
    }
}

function deleteGroupVillage(gvId) {
    if (confirm('ເຈົ້າແນ່ໃຈບໍ່ທີ່ຈະລົບກຸ່ມບ້ານນີ້ອອກ?')) {
        db.collection('group_villages').doc(gvId).delete()
            .then(() => loadGroupVillages())
            .catch(err => alert('ຂໍ້ຜິດພາດ: ' + err.message));
    }
}

function deleteVillage(villageId) {
    if (confirm('ເຈົ້າແນ່ໃຈບໍທີ່ຈະລົບບ້ານນີ້ອອກ?')) {
        db.collection('villages').doc(villageId).delete()
            .then(() => loadVillages())
            .catch(err => alert('ຂໍ້ຜິດພາດ: ' + err.message));
    }
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function navigatePage(direction, type) {
    const map = {
        'province':      { curr: 'current-page-province',      total: 'total-pages-province',      fn: displayProvinces      },
        'district':      { curr: 'current-page-district',      total: 'total-pages-district',      fn: displayDistricts      },
        'group-village': { curr: 'current-page-group-village', total: 'total-pages-group-village', fn: displayGroupVillages  },
        'village-admin': { curr: 'current-page-village',       total: 'total-pages-village',       fn: displayVillagesAdmin  },
        'village':       { curr: 'current-page',               total: 'total-pages',               fn: displayVillages       }
    };

    const cfg = map[type];
    let currentPageNum = parseInt(document.getElementById(cfg.curr).textContent);
    const totalPages   = parseInt(document.getElementById(cfg.total).textContent);

    if (direction === 'prev' && currentPageNum > 1)          currentPageNum--;
    else if (direction === 'next' && currentPageNum < totalPages) currentPageNum++;

    document.getElementById(cfg.curr).textContent = currentPageNum;
    cfg.fn();
}