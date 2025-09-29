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
let villages = [];
let searchTimeout = null;

// Filtered data storage
let currentFilteredVillages = [];
let currentFilteredProvinces = [];
let currentFilteredDistricts = [];
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
    // Check if user is logged in
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

    // Modal controls
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

    document.getElementById('village-form').addEventListener('submit', function(e) {
        e.preventDefault();
        saveVillage();
    });

    // Real-time search functionality
    document.getElementById('village-search').addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            filterVillages();
        }, 300);
    });

    document.getElementById('province-search').addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            filterProvinces();
        }, 300);
    });

    document.getElementById('district-search').addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            filterDistricts();
        }, 300);
    });

    document.getElementById('village-admin-search').addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            filterVillagesAdmin();
        }, 300);
    });

    // Province filter change
    document.getElementById('province-filter').addEventListener('change', function() {
        updateDistrictFilter();
        filterVillages();
    });

    document.getElementById('district-filter').addEventListener('change', function() {
        filterVillages();
    });

    // Village form province change
    document.getElementById('village-province').addEventListener('change', function() {
        updateVillageDistrictFilter(this.value);
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

    document.getElementById('prev-page-village').addEventListener('click', function() {
        navigatePage('prev', 'village-admin');
    });

    document.getElementById('next-page-village').addEventListener('click', function() {
        navigatePage('next', 'village-admin');
    });
}

function showPage(page) {
    // Hide all pages
    pageSections.forEach(section => {
        section.classList.add('hidden');
    });

    // Show the selected page
    document.getElementById(page).classList.remove('hidden');

    // Update navigation
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === page) {
            link.classList.add('active');
        }
    });

    currentPage = page;

    // Load data for the current page
    switch(page) {
        case 'user-search':
            displayVillages();
            break;
        case 'province-management':
            displayProvinces();
            break;
        case 'district-management':
            displayDistricts();
            break;
        case 'village-management':
            displayVillagesAdmin();
            break;
    }
}

function showAdminSections() {
    // Enable admin navigation
    navLinks.forEach(link => {
        if (link.getAttribute('data-page') !== 'user-search') {
            link.style.display = 'block';
        }
    });
}

function hideAdminSections() {
    // Disable admin navigation
    navLinks.forEach(link => {
        if (link.getAttribute('data-page') !== 'user-search') {
            link.style.display = 'none';
        }
    });

    // If on an admin page, redirect to user search
    if (currentPage !== 'user-search' && currentPage !== 'login-section') {
        showPage('user-search');
    }
}

function loadInitialData() {
    // Load provinces, districts, and villages from Firebase
    loadProvinces();
    loadDistricts();
    loadVillages();
}

function loadProvinces() {
    db.collection('provinces').orderBy('pr_id').get()
        .then(snapshot => {
            provinces = [];
            snapshot.forEach(doc => {
                provinces.push({ id: doc.id, ...doc.data() });
            });
            // Reset filtered data
            currentFilteredProvinces = [];
            populateProvinceFilters();
            if (currentPage === 'province-management') {
                displayProvinces();
            }
        })
        .catch(error => {
            console.error('ຂໍ້ຜິດໃນການໂຫຼດຂໍ້ມູນແຂວງ:', error);
        });
}

function loadDistricts() {
    db.collection('districts').orderBy('di_id').get()
        .then(snapshot => {
            districts = [];
            snapshot.forEach(doc => {
                districts.push({ id: doc.id, ...doc.data() });
            });
            // Reset filtered data
            currentFilteredDistricts = [];
            populateDistrictFilters();
            if (currentPage === 'district-management') {
                displayDistricts();
            }
        })
        .catch(error => {
            console.error('ຂໍ້ຜິດພາດໃນການໂຫຼດຂໍ້ມູນເມືອງ:', error);
        });
}

function loadVillages() {
    db.collection('villages').orderBy('vill_id').get()
        .then(snapshot => {
            villages = [];
            snapshot.forEach(doc => {
                villages.push({ id: doc.id, ...doc.data() });
            });
            // Reset filtered data
            currentFilteredVillages = [];
            currentFilteredVillagesAdmin = [];
            if (currentPage === 'village-management' || currentPage === 'user-search') {
                if (currentPage === 'village-management') {
                    displayVillagesAdmin();
                } else {
                    displayVillages();
                }
            }
        })
        .catch(error => {
            console.error('ຂໍ້ຜິດພາດໃນການໂຫຼດຂໍ້ມູນບ້ານ:', error);
        });
}

function populateProvinceFilters() {
    const provinceFilter = document.getElementById('province-filter');
    const districtProvince = document.getElementById('district-province');
    const villageProvince = document.getElementById('village-province');
    
    // Clear existing options (except the first one)
    while (provinceFilter.children.length > 1) {
        provinceFilter.removeChild(provinceFilter.lastChild);
    }
    while (districtProvince.children.length > 1) {
        districtProvince.removeChild(districtProvince.lastChild);
    }
    while (villageProvince.children.length > 1) {
        villageProvince.removeChild(villageProvince.lastChild);
    }
    
    // Add provinces to filters
    provinces.forEach(province => {
        const option = document.createElement('option');
        option.value = province.pr_id;
        option.textContent = province.pr_name;
        
        provinceFilter.appendChild(option.cloneNode(true));
        districtProvince.appendChild(option.cloneNode(true));
        villageProvince.appendChild(option);
    });
}

function populateDistrictFilters() {
    const districtFilter = document.getElementById('district-filter');
    const villageDistrict = document.getElementById('village-district');
    
    // Clear existing options (except the first one)
    while (districtFilter.children.length > 1) {
        districtFilter.removeChild(districtFilter.lastChild);
    }
    while (villageDistrict.children.length > 1) {
        villageDistrict.removeChild(villageDistrict.lastChild);
    }
    
    // Add districts to filters
    districts.forEach(district => {
        const option = document.createElement('option');
        option.value = district.di_id;
        option.textContent = district.di_name;
        
        districtFilter.appendChild(option.cloneNode(true));
        villageDistrict.appendChild(option);
    });
}

function updateDistrictFilter() {
    const provinceId = document.getElementById('province-filter').value;
    const districtFilter = document.getElementById('district-filter');
    
    // Clear existing options (except the first one)
    while (districtFilter.children.length > 1) {
        districtFilter.removeChild(districtFilter.lastChild);
    }
    
    // Add districts for the selected province
    if (provinceId) {
        districts
            .filter(district => district.pr_id == provinceId)
            .forEach(district => {
                const option = document.createElement('option');
                option.value = district.di_id;
                option.textContent = district.di_name;
                districtFilter.appendChild(option);
            });
    }
}

function updateVillageDistrictFilter(provinceId) {
    const villageDistrict = document.getElementById('village-district');
    
    // Clear existing options (except the first one)
    while (villageDistrict.children.length > 1) {
        villageDistrict.removeChild(villageDistrict.lastChild);
    }
    
    // Add districts for the selected province
    districts
        .filter(district => district.pr_id == provinceId)
        .forEach(district => {
            const option = document.createElement('option');
            option.value = district.di_id;
            option.textContent = district.di_name;
            villageDistrict.appendChild(option);
        });
}

function filterVillages() {
    const provinceId = document.getElementById('province-filter').value;
    const districtId = document.getElementById('district-filter').value;
    const searchTerm = document.getElementById('village-search').value.toLowerCase();
    
    let filteredVillages = villages;
    
    // Filter by province
    if (provinceId) {
        filteredVillages = filteredVillages.filter(village => {
            const district = districts.find(d => d.di_id == village.di_id);
            return district && district.pr_id == provinceId;
        });
    }
    
    // Filter by district
    if (districtId) {
        filteredVillages = filteredVillages.filter(village => village.di_id == districtId);
    }
    
    // Filter by search term
    if (searchTerm) {
        filteredVillages = filteredVillages.filter(village => 
            village.vill_name.toLowerCase().includes(searchTerm) || 
            (village.vill_name_en && village.vill_name_en.toLowerCase().includes(searchTerm))
        );
    }
    
    // Store the filtered data
    currentFilteredVillages = filteredVillages;
    
    // Reset to page 1 when filtering
    document.getElementById('current-page').textContent = 1;
    
    displayVillages(currentFilteredVillages);
}

function filterProvinces() {
    const searchTerm = document.getElementById('province-search').value.toLowerCase();
    
    let filteredProvinces = provinces;
    
    if (searchTerm) {
        filteredProvinces = filteredProvinces.filter(province => 
            province.pr_name.toLowerCase().includes(searchTerm) || 
            (province.pr_name_en && province.pr_name_en.toLowerCase().includes(searchTerm))
        );
    }
    
    // Store the filtered data
    currentFilteredProvinces = filteredProvinces;
    
    // Reset to page 1 when filtering
    document.getElementById('current-page-province').textContent = 1;
    
    displayProvinces(currentFilteredProvinces);
}

function filterDistricts() {
    const searchTerm = document.getElementById('district-search').value.toLowerCase();
    
    let filteredDistricts = districts;
    
    if (searchTerm) {
        filteredDistricts = filteredDistricts.filter(district => 
            district.di_name.toLowerCase().includes(searchTerm) || 
            (district.di_name_en && district.di_name_en.toLowerCase().includes(searchTerm))
        );
    }
    
    // Store the filtered data
    currentFilteredDistricts = filteredDistricts;
    
    // Reset to page 1 when filtering
    document.getElementById('current-page-district').textContent = 1;
    
    displayDistricts(currentFilteredDistricts);
}

function filterVillagesAdmin() {
    const searchTerm = document.getElementById('village-admin-search').value.toLowerCase();
    
    let filteredVillages = villages;
    
    if (searchTerm) {
        filteredVillages = filteredVillages.filter(village => 
            village.vill_name.toLowerCase().includes(searchTerm) || 
            (village.vill_name_en && village.vill_name_en.toLowerCase().includes(searchTerm))
        );
    }
    
    // Store the filtered data
    currentFilteredVillagesAdmin = filteredVillages;
    
    // Reset to page 1 when filtering
    document.getElementById('current-page-village').textContent = 1;
    
    displayVillagesAdmin(currentFilteredVillagesAdmin);
}

function displayVillages(villageList = null) {
    const tableBody = document.getElementById('village-table-body');
    tableBody.innerHTML = '';
    
    // Use the passed list, or the stored filtered list, or all villages
    let displayList;
    if (villageList) {
        displayList = villageList;
    } else if (currentFilteredVillages.length > 0) {
        displayList = currentFilteredVillages;
    } else {
        displayList = villages;
    }
    
    if (displayList.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="4" style="text-align: center;">ບໍ່ພົບຂໍ້ມູນບ້ານ</td>`;
        tableBody.appendChild(row);
        return;
    }
    
    // For user search, show 10 records per page
    const pageSize = 10;
    const currentPageNum = parseInt(document.getElementById('current-page').textContent) || 1;
    const startIndex = (currentPageNum - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedVillages = displayList.slice(startIndex, endIndex);
    const totalPages = Math.ceil(displayList.length / pageSize);
    
    document.getElementById('total-pages').textContent = totalPages;
    
    paginatedVillages.forEach(village => {
        const district = districts.find(d => d.di_id == village.di_id);
        const province = district ? provinces.find(p => p.pr_id == district.pr_id) : null;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${village.vill_name}</td>
            <td>${village.vill_name_en || '-'}</td>
            <td>${district ? district.di_name : 'Unknown'}</td>
            <td>${province ? province.pr_name : 'Unknown'}</td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Update pagination buttons
    document.getElementById('prev-page').disabled = currentPageNum <= 1;
    document.getElementById('next-page').disabled = currentPageNum >= totalPages;
}

function displayProvinces(provinceList = null) {
    const tableBody = document.getElementById('province-table-body');
    tableBody.innerHTML = '';
    
    // Use the passed list, or the stored filtered list, or all provinces
    let displayList;
    if (provinceList) {
        displayList = provinceList;
    } else if (currentFilteredProvinces.length > 0) {
        displayList = currentFilteredProvinces;
    } else {
        displayList = provinces;
    }
    
    if (displayList.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="4" style="text-align: center;">ບໍ່ພົບຂໍ້ມູນແຂວງ</td>`;
        tableBody.appendChild(row);
        return;
    }
    
    const pageSize = 10;
    const currentPageNum = parseInt(document.getElementById('current-page-province').textContent) || 1;
    const startIndex = (currentPageNum - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedProvinces = displayList.slice(startIndex, endIndex);
    const totalPages = Math.ceil(displayList.length / pageSize);
    
    document.getElementById('total-pages-province').textContent = totalPages;
    
    paginatedProvinces.forEach(province => {
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
    
    // Update pagination buttons
    document.getElementById('prev-page-province').disabled = currentPageNum <= 1;
    document.getElementById('next-page-province').disabled = currentPageNum >= totalPages;
    
    // Add event listeners to action buttons
    document.querySelectorAll('.edit-province').forEach(btn => {
        btn.addEventListener('click', function() {
            const provinceId = this.getAttribute('data-id');
            editProvince(provinceId);
        });
    });
    
    document.querySelectorAll('.delete-province').forEach(btn => {
        btn.addEventListener('click', function() {
            const provinceId = this.getAttribute('data-id');
            deleteProvince(provinceId);
        });
    });
}

function displayDistricts(districtList = null) {
    const tableBody = document.getElementById('district-table-body');
    tableBody.innerHTML = '';
    
    // Use the passed list, or the stored filtered list, or all districts
    let displayList;
    if (districtList) {
        displayList = districtList;
    } else if (currentFilteredDistricts.length > 0) {
        displayList = currentFilteredDistricts;
    } else {
        displayList = districts;
    }
    
    if (displayList.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="5" style="text-align: center;">ບໍ່ພົບຂໍ້ມູນເມືອງ</td>`;
        tableBody.appendChild(row);
        return;
    }
    
    const pageSize = 10;
    const currentPageNum = parseInt(document.getElementById('current-page-district').textContent) || 1;
    const startIndex = (currentPageNum - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedDistricts = displayList.slice(startIndex, endIndex);
    const totalPages = Math.ceil(displayList.length / pageSize);
    
    document.getElementById('total-pages-district').textContent = totalPages;
    
    paginatedDistricts.forEach(district => {
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
    
    // Update pagination buttons
    document.getElementById('prev-page-district').disabled = currentPageNum <= 1;
    document.getElementById('next-page-district').disabled = currentPageNum >= totalPages;
    
    // Add event listeners to action buttons
    document.querySelectorAll('.edit-district').forEach(btn => {
        btn.addEventListener('click', function() {
            const districtId = this.getAttribute('data-id');
            editDistrict(districtId);
        });
    });
    
    document.querySelectorAll('.delete-district').forEach(btn => {
        btn.addEventListener('click', function() {
            const districtId = this.getAttribute('data-id');
            deleteDistrict(districtId);
        });
    });
}

function displayVillagesAdmin(villageList = null) {
    const tableBody = document.getElementById('village-admin-table-body');
    tableBody.innerHTML = '';
    
    // Use the passed list, or the stored filtered list, or all villages
    let displayList;
    if (villageList) {
        displayList = villageList;
    } else if (currentFilteredVillagesAdmin.length > 0) {
        displayList = currentFilteredVillagesAdmin;
    } else {
        displayList = villages;
    }
    
    if (displayList.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="6" style="text-align: center;">ບໍ່ພົບຂໍ້ມູນບ້ານ</td>`;
        tableBody.appendChild(row);
        return;
    }
    
    const pageSize = 10;
    const currentPageNum = parseInt(document.getElementById('current-page-village').textContent) || 1;
    const startIndex = (currentPageNum - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedVillages = displayList.slice(startIndex, endIndex);
    const totalPages = Math.ceil(displayList.length / pageSize);
    
    document.getElementById('total-pages-village').textContent = totalPages;
    
    paginatedVillages.forEach(village => {
        const district = districts.find(d => d.di_id == village.di_id);
        const province = district ? provinces.find(p => p.pr_id == district.pr_id) : null;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${village.vill_id}</td>
            <td>${village.vill_name}</td>
            <td>${village.vill_name_en || '-'}</td>
            <td>${district ? district.di_name : 'Unknown'}</td>
            <td>${province ? province.pr_name : 'Unknown'}</td>
            <td class="action-buttons">
                <button class="action-btn btn-warning edit-village" data-id="${village.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn btn-danger delete-village" data-id="${village.id}"><i class="fas fa-trash"></i></button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Update pagination buttons
    document.getElementById('prev-page-village').disabled = currentPageNum <= 1;
    document.getElementById('next-page-village').disabled = currentPageNum >= totalPages;
    
    // Add event listeners to action buttons
    document.querySelectorAll('.edit-village').forEach(btn => {
        btn.addEventListener('click', function() {
            const villageId = this.getAttribute('data-id');
            editVillage(villageId);
        });
    });
    
    document.querySelectorAll('.delete-village').forEach(btn => {
        btn.addEventListener('click', function() {
            const villageId = this.getAttribute('data-id');
            deleteVillage(villageId);
        });
    });
}

function showProvinceModal(province = null) {
    const modal = document.getElementById('province-modal');
    const title = document.getElementById('province-modal-title');
    const form = document.getElementById('province-form');
    
    if (province) {
        title.textContent = 'ແກ້ໄຂແຂວງ';
        document.getElementById('province-id').value = province.pr_id;
        document.getElementById('province-name').value = province.pr_name;
        document.getElementById('province-name-en').value = province.pr_name_en || '';
        form.setAttribute('data-id', province.id);
    } else {
        title.textContent = 'ເພີ່ມແຂວງ';
        form.reset();
        form.removeAttribute('data-id');
        // Generate auto ID for new province
        generateAutoProvinceId();
    }
    
    modal.style.display = 'flex';
}

function showDistrictModal(district = null) {
    const modal = document.getElementById('district-modal');
    const title = document.getElementById('district-modal-title');
    const form = document.getElementById('district-form');
    
    if (district) {
        title.textContent = 'ແກ້ໄຂເມືອງ';
        document.getElementById('district-id').value = district.di_id;
        document.getElementById('district-name').value = district.di_name;
        document.getElementById('district-name-en').value = district.di_name_en || '';
        document.getElementById('district-province').value = district.pr_id;
        form.setAttribute('data-id', district.id);
    } else {
        title.textContent = 'ເພີ່ມເມືອງ';
        form.reset();
        form.removeAttribute('data-id');
        // Generate auto ID for new district
        generateAutoDistrictId();
    }
    
    modal.style.display = 'flex';
}

function showVillageModal(village = null) {
    const modal = document.getElementById('village-modal');
    const title = document.getElementById('village-modal-title');
    const form = document.getElementById('village-form');
    
    if (village) {
        title.textContent = 'ແກ້ໄຂບ້ານ';
        document.getElementById('village-id').value = village.vill_id;
        document.getElementById('village-name').value = village.vill_name;
        document.getElementById('village-name-en').value = village.vill_name_en || '';
        
        const district = districts.find(d => d.di_id == village.di_id);
        if (district) {
            document.getElementById('village-province').value = district.pr_id;
            updateVillageDistrictFilter(district.pr_id);
            document.getElementById('village-district').value = village.di_id;
        }
        
        form.setAttribute('data-id', village.id);
    } else {
        title.textContent = 'ເພີ່ມບ້ານ';
        form.reset();
        form.removeAttribute('data-id');
        // Generate auto ID for new village
        generateAutoVillageId();
    }
    
    modal.style.display = 'flex';
}

function generateAutoProvinceId() {
    if (provinces.length === 0) {
        document.getElementById('province-id').value = 1;
        return;
    }
    
    // Find the highest province ID and add 1
    const maxId = Math.max(...provinces.map(p => p.pr_id));
    document.getElementById('province-id').value = maxId + 1;
}

function generateAutoDistrictId() {
    if (districts.length === 0) {
        document.getElementById('district-id').value = 1;
        return;
    }
    
    // Find the highest district ID and add 1
    const maxId = Math.max(...districts.map(d => d.di_id));
    document.getElementById('district-id').value = maxId + 1;
}

function generateAutoVillageId() {
    if (villages.length === 0) {
        document.getElementById('village-id').value = 1;
        return;
    }
    
    // Find the highest village ID and add 1
    const maxId = Math.max(...villages.map(v => v.vill_id));
    document.getElementById('village-id').value = maxId + 1;
}

function saveProvince() {
    const form = document.getElementById('province-form');
    const provinceId = form.getAttribute('data-id');
    const data = {
        pr_id: parseInt(document.getElementById('province-id').value),
        pr_name: document.getElementById('province-name').value,
        pr_name_en: document.getElementById('province-name-en').value || null
    };
    
    if (provinceId) {
        // Update existing province
        db.collection('provinces').doc(provinceId).update(data)
            .then(() => {
                loadProvinces();
                document.getElementById('province-modal').style.display = 'none';
            })
            .catch(error => {
                console.error('ຂໍ້ຜິດພາດໃນການອັບເດດແຂວງ:', error);
                alert('ຂໍ້ຜິດພາດໃນການອັບເດດແຂວງ: ' + error.message);
            });
    } else {
        // Add new province
        db.collection('provinces').add(data)
            .then(() => {
                loadProvinces();
                document.getElementById('province-modal').style.display = 'none';
            })
            .catch(error => {
                console.error('ຂໍ້ຜິດພາດໃນການເພີ່ມແຂວງ:', error);
                alert('ຂໍ້ຜິດພາດໃນການເພີ່ມແຂວງ: ' + error.message);
            });
    }
}

function saveDistrict() {
    const form = document.getElementById('district-form');
    const districtId = form.getAttribute('data-id');
    const data = {
        di_id: parseInt(document.getElementById('district-id').value),
        di_name: document.getElementById('district-name').value,
        di_name_en: document.getElementById('district-name-en').value || null,
        pr_id: parseInt(document.getElementById('district-province').value)
    };
    
    if (districtId) {
        // Update existing district
        db.collection('districts').doc(districtId).update(data)
            .then(() => {
                loadDistricts();
                document.getElementById('district-modal').style.display = 'none';
            })
            .catch(error => {
                console.error('ຂໍ້ຜິດພາດໃນການອັບເດດເມືອງ:', error);
                alert('ຂໍ້ຜິດພາດໃນການອັບເດດເມືອງ: ' + error.message);
            });
    } else {
        // Add new district
        db.collection('districts').add(data)
            .then(() => {
                loadDistricts();
                document.getElementById('district-modal').style.display = 'none';
            })
            .catch(error => {
                console.error('ຂໍ້ຜິດພາດໃນການເພີ່ມເມືອງ:', error);
                alert('ຂໍ້ຜິດພາດໃນການເພີ່ມເມືອງ: ' + error.message);
            });
    }
}

function saveVillage() {
    const form = document.getElementById('village-form');
    const villageId = form.getAttribute('data-id');
    const data = {
        vill_id: parseInt(document.getElementById('village-id').value),
        vill_name: document.getElementById('village-name').value,
        vill_name_en: document.getElementById('village-name-en').value || null,
        di_id: parseInt(document.getElementById('village-district').value)
    };
    
    if (villageId) {
        // Update existing village
        db.collection('villages').doc(villageId).update(data)
            .then(() => {
                loadVillages();
                document.getElementById('village-modal').style.display = 'none';
            })
            .catch(error => {
                console.error('ຂໍ້ຜິດພາດໃນການອັບເດດບ້ານ:', error);
                alert('ຂໍ້ຜິດພາດໃນການອັບເດດບ້ານ: ' + error.message);
            });
    } else {
        // Add new village
        db.collection('villages').add(data)
            .then(() => {
                loadVillages();
                document.getElementById('village-modal').style.display = 'none';
            })
            .catch(error => {
                console.error('ຂໍ້ຜິດພາດໃນການເພີ່ມບ້ານ:', error);
                alert('ຂໍ້ຜິດພາດໃນການເພີ່ມບ້ານ: ' + error.message);
            });
    }
}

function editProvince(provinceId) {
    const province = provinces.find(p => p.id === provinceId);
    if (province) {
        showProvinceModal(province);
    }
}

function editDistrict(districtId) {
    const district = districts.find(d => d.id === districtId);
    if (district) {
        showDistrictModal(district);
    }
}

function editVillage(villageId) {
    const village = villages.find(v => v.id === villageId);
    if (village) {
        showVillageModal(village);
    }
}

function deleteProvince(provinceId) {
    if (confirm('ເຈົ້າແນ່ໃຈບໍ່ທີ່ຈະລົບແຂວງນີ້ອອກ? ມັນຈະລົບເມືອງ ແລະ ບ້ານທັງໝົດທີ່ຢູ່ໃນແຂວງນີ້.')) {
        db.collection('provinces').doc(provinceId).delete()
            .then(() => {
                loadProvinces();
            })
            .catch(error => {
                console.error('ຂໍ້ຜິດພາດໃນການລົບແຂວງ:', error);
                alert('ຂໍ້ຜິດພາດໃນການລົບແຂວງ: ' + error.message);
            });
    }
}

function deleteDistrict(districtId) {
    if (confirm('ເຈົ້າແນ່ໃຈບໍ່ທີ່ຈະລົບເມືອງນີ້ອອກ? ມັນຈະລົບບ້ານທັງໝົດທີ່ຢູ່ໃນເມືອງນີ້.')) {
        db.collection('districts').doc(districtId).delete()
            .then(() => {
                loadDistricts();
            })
            .catch(error => {
                console.error('ຂໍ້ຜິດພາດໃນການລົບເມືອງ:', error);
                alert('ຂໍ້ຜິດພາດໃນການລົບເມືອງ: ' + error.message);
            });
    }
}

function deleteVillage(villageId) {
    if (confirm('ເຈົ້າແນ່ໃຈບໍທີ່ຈະລົບບ້ານນີ້ອອກ?')) {
        db.collection('villages').doc(villageId).delete()
            .then(() => {
                loadVillages();
            })
            .catch(error => {
                console.error('ຂໍ້ຜິດພາດໃນການລົບບ້ານ:', error);
                alert('ຂໍ້ຜິດພາດໃນການລົບບ້ານ: ' + error.message);
            });
    }
}

function navigatePage(direction, type) {
    let currentPageElement, totalPagesElement, displayFunction;
    
    switch(type) {
        case 'province':
            currentPageElement = document.getElementById('current-page-province');
            totalPagesElement = document.getElementById('total-pages-province');
            displayFunction = displayProvinces;
            break;
        case 'district':
            currentPageElement = document.getElementById('current-page-district');
            totalPagesElement = document.getElementById('total-pages-district');
            displayFunction = displayDistricts;
            break;
        case 'village-admin':
            currentPageElement = document.getElementById('current-page-village');
            totalPagesElement = document.getElementById('total-pages-village');
            displayFunction = displayVillagesAdmin;
            break;
        default: // 'village'
            currentPageElement = document.getElementById('current-page');
            totalPagesElement = document.getElementById('total-pages');
            displayFunction = displayVillages;
            break;
    }
    
    let currentPageNum = parseInt(currentPageElement.textContent);
    const totalPages = parseInt(totalPagesElement.textContent);
    
    if (direction === 'prev' && currentPageNum > 1) {
        currentPageNum--;
    } else if (direction === 'next' && currentPageNum < totalPages) {
        currentPageNum++;
    }
    
    currentPageElement.textContent = currentPageNum;
    displayFunction();
}