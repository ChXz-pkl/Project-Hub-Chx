// Impor fungsi-fungsi yang kita butuhkan dari Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
    getFirestore, collection, getDocs, doc, addDoc,
    updateDoc, deleteDoc, getDoc, query, orderBy,
    limit, startAfter // <-- TAMBAHKAN DUA INI
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import {
    getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

// GANTI DENGAN KODE KONFIGURASI DARI PROYEK FIREBASE-MU!
const firebaseConfig = {
    apiKey: "AIzaSyB4Owqi9BzTiiIEn-uFO_3LR0-M-cUNXuU",
    authDomain: "project-hub-59deb.firebaseapp.com",
    projectId: "project-hub-59deb",
    storageBucket: "project-hub-59deb.firebasestorage.app",
    messagingSenderId: "774293207846",
    appId: "1:774293207846:web:212bce38412f28041cdfe7",
    measurementId: "G-9YD95MKGGZ"
};

// --- KREDENSIAL CLOUDINARY ---
const CLOUDINARY_CLOUD_NAME = "dkrdaeldf";
const CLOUDINARY_UPLOAD_PRESET = "project-hub";
// -------------------------

// --- DAFTAR KATEGORI YANG TERSEDIA ---
const availableCategories = ["Web App", "Mobile App", "Desain Grafis", "UI/UX", "Lainnya"];

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const projectsCollectionRef = collection(db, 'projects');

// --- Mulai Logika Aplikasi ---
document.addEventListener('DOMContentLoaded', () => {

    // GANTI SELURUH BLOK INI di script.js

    // --- LOGIKA HALAMAN PUBLIK (index.html) ---
    // GANTI SELURUH BLOK INI di script.js

    // --- LOGIKA HALAMAN PUBLIK (index.html) ---
    const publicProjectList = document.getElementById('project-list');
    if (publicProjectList) {
        const projectsPerPage = 6; // Atur jumlah proyek per halaman
        let currentPage = 1;
        let allProjects = []; // Menyimpan semua proyek dari database
        let currentlyDisplayedProjects = []; // Menyimpan proyek yang sedang ditampilkan (hasil filter/pencarian)

        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const pageIndicator = document.getElementById('page-indicator');
        const filterContainer = document.getElementById('filter-buttons');
        const searchInput = document.getElementById('search-input');
        const searchContainer = document.querySelector('.search-container'); // Menggunakan querySelector

        // Fungsi untuk menampilkan proyek ke halaman
        const renderProjects = () => {
            publicProjectList.innerHTML = '';
            pageIndicator.textContent = `Halaman ${currentPage}`;

            const startIndex = (currentPage - 1) * projectsPerPage;
            const endIndex = startIndex + projectsPerPage;
            const projectsToRender = currentlyDisplayedProjects.slice(startIndex, endIndex);

            // Urutkan ulang di sini agar proyek unggulan selalu di atas di setiap halaman
            projectsToRender.sort((a, b) => (b.isFeatured || false) - (a.isFeatured || false));

            if (projectsToRender.length === 0) {
                publicProjectList.innerHTML = '<p>Tidak ada proyek yang cocok dengan kriteria Anda.</p>';
            } else {
                projectsToRender.forEach(project => {
                    const card = document.createElement('div');
                    card.className = 'project-card';
                    if (project.isFeatured) {
                        card.classList.add('featured');
                    }
                    card.dataset.category = project.category;
                    card.innerHTML = `
                    <img src="${project.mainImageUrl}" alt="${project.title}">
                    <div class="project-card-content">
                        ${project.isFeatured ? '<div class="featured-badge">Unggulan</div>' : ''}
                        <h3>${project.title}</h3>
                        <p>${project.description.substring(0, 100)}...</p>
                        <a href="detail.html?id=${project.id}">Lihat Detail</a>
                    </div>
                `;
                    publicProjectList.appendChild(card);
                });
            }

            // Atur status tombol pagination
            prevBtn.disabled = (currentPage === 1);
            nextBtn.disabled = (endIndex >= currentlyDisplayedProjects.length);
        };

        // Fungsi utama yang menerapkan filter DAN pencarian
        const applyFiltersAndRender = () => {
            const selectedCategory = document.querySelector('.filter-btn.active').dataset.category;
            const searchTerm = searchInput.value.toLowerCase();

            let filteredProjects = allProjects;

            // 1. Filter berdasarkan kategori
            if (selectedCategory !== 'Semua') {
                filteredProjects = filteredProjects.filter(p => p.category === selectedCategory);
            }

            // 2. Filter berdasarkan pencarian
            if (searchTerm) {
                filteredProjects = filteredProjects.filter(p =>
                    p.title.toLowerCase().includes(searchTerm) ||
                    p.description.toLowerCase().includes(searchTerm)
                );
            }

            currentlyDisplayedProjects = filteredProjects;
            currentPage = 1; // Selalu reset ke halaman 1 setiap kali filter/pencarian berubah
            renderProjects();
        };

        const createFilterButtons = (projects) => {
            const categories = ['Semua', ...new Set(projects.map(p => p.category).filter(Boolean))];

            filterContainer.innerHTML = '';
            categories.forEach(category => {
                const button = document.createElement('button');
                button.className = 'filter-btn';
                button.textContent = category;
                button.dataset.category = category;
                if (category === 'Semua') button.classList.add('active');
                filterContainer.appendChild(button);
            });

            filterContainer.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') {
                    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                    e.target.classList.add('active');
                    applyFiltersAndRender();
                }
            });
        };

        // Fungsi utama untuk memuat semua proyek dari Firestore
        const loadAllProjects = async () => {
            publicProjectList.innerHTML = '<p>Memuat proyek...</p>';
            try {
                const q = query(projectsCollectionRef, orderBy("createdAt", "desc"));
                const querySnapshot = await getDocs(q);
                allProjects = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                if (allProjects.length === 0) {
                    document.getElementById('no-projects-message').style.display = 'block';
                    publicProjectList.innerHTML = '';
                    filterContainer.style.display = 'none';
                    searchContainer.style.display = 'none';
                } else {
                    createFilterButtons(allProjects);
                    searchInput.addEventListener('input', applyFiltersAndRender);
                    applyFiltersAndRender(); // Tampilkan semua proyek pada awalnya
                }
            } catch (error) {
                console.error("Error fetching projects: ", error);
                publicProjectList.innerHTML = "<p>Gagal memuat proyek.</p>";
            }
        };

        // Event listener untuk tombol pagination
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderProjects();
            }
        });

        nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(currentlyDisplayedProjects.length / projectsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderProjects();
            }
        });

        // Jalankan fungsi utama
        loadAllProjects();
    }

    // --- LOGIKA HALAMAN LOGIN (login.html) ---
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const errorMessage = document.getElementById('error-message');
            const submitButton = loginForm.querySelector('button');
            submitButton.disabled = true;
            submitButton.textContent = 'Logging in...';
            signInWithEmailAndPassword(auth, email, password)
                .then(() => { window.location.href = 'admin.html'; })
                .catch(() => {
                    errorMessage.textContent = 'Email atau password salah!';
                    errorMessage.style.display = 'block';
                    submitButton.disabled = false;
                    submitButton.textContent = 'Login';
                });
        });
    }

    // --- LOGIKA HALAMAN REGISTER (register.html) ---
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const errorMessage = document.getElementById('error-message');
            const submitButton = registerForm.querySelector('button');
            submitButton.disabled = true;
            submitButton.textContent = 'Mendaftarkan...';
            createUserWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    alert('Registrasi berhasil! Anda akan langsung diarahkan ke panel admin.');
                    window.location.href = 'admin.html';
                })
                .catch((error) => {
                    let message = 'Terjadi kesalahan saat registrasi.';
                    if (error.code === 'auth/email-already-in-use') {
                        message = 'Email ini sudah terdaftar. Silakan gunakan email lain.';
                    } else if (error.code === 'auth/weak-password') {
                        message = 'Password terlalu lemah. Gunakan minimal 6 karakter.';
                    }
                    errorMessage.textContent = message;
                    errorMessage.style.display = 'block';
                })
                .finally(() => {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Register';
                });
        });
    }

    // --- LOGIKA HALAMAN ADMIN (admin.html) ---
    const adminProjectList = document.getElementById('admin-project-list');
    if (adminProjectList) {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                document.getElementById('admin-email').textContent = user.email;
                document.getElementById('logout-btn').addEventListener('click', () => {
                    signOut(auth).then(() => { window.location.href = 'login.html'; });
                });

                const categorySelect = document.getElementById('project-category');
                availableCategories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category;
                    option.textContent = category;
                    categorySelect.appendChild(option);
                });

                const renderAdminProjects = async () => {
                    adminProjectList.innerHTML = 'Memuat proyek...';
                    const q = query(projectsCollectionRef, orderBy("createdAt", "desc"));
                    const querySnapshot = await getDocs(q);
                    const projects = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    adminProjectList.innerHTML = '';
                    projects.forEach(project => {
                        const item = document.createElement('div');
                        item.className = 'admin-project-list-item';
                        item.innerHTML = `
                            <span>${project.title}</span>
                            <div>
                                <button class="edit-btn" data-id="${project.id}">Edit</button>
                                <button class="delete-btn" data-id="${project.id}">Hapus</button>
                            </div>
                        `;
                        adminProjectList.appendChild(item);
                    });
                };

                const projectForm = document.getElementById('project-form');
                const submitButton = projectForm.querySelector('button');

                projectForm.addEventListener('submit', async (e) => {
                    e.preventDefault();

                    // --- TAMBAHKAN VALIDASI MANUAL INI ---
                    const descriptionContent = tinymce.get('project-description').getContent();
                    if (!descriptionContent) {
                        Swal.fire({
                            title: 'Oops...',
                            text: 'Deskripsi Proyek tidak boleh kosong!',
                            icon: 'error'
                        });
                        return;
                    }
                    // ------------------------------------

                    submitButton.disabled = true;
                    submitButton.textContent = 'Menyimpan...';

                    try {
                        const uploadToCloudinary = async (file) => {
                            const formData = new FormData();
                            formData.append('file', file);
                            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
                            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                                method: 'POST', body: formData
                            });
                            if (!response.ok) throw new Error('Gagal upload ke Cloudinary');
                            const data = await response.json();
                            return data.secure_url;
                        };

                        let mainImageUrl = document.getElementById('project-image-old-url').value;
                        let galleryImageUrls = [];

                        const mainImageFile = document.getElementById('project-image').files[0];
                        if (mainImageFile) mainImageUrl = await uploadToCloudinary(mainImageFile);

                        const galleryImageFiles = document.getElementById('project-images').files;
                        if (galleryImageFiles.length > 0) {
                            for (const file of galleryImageFiles) {
                                const url = await uploadToCloudinary(file);
                                galleryImageUrls.push(url);
                            }
                        }

                        const projectData = {
                            title: document.getElementById('project-title').value,
                            description: tinymce.get('project-description').getContent(),
                            link: document.getElementById('project-link').value,
                            category: document.getElementById('project-category').value, // <-- INI BARIS YANG DIPERBAIKI
                            mainImageUrl: mainImageUrl,
                            isFeatured: document.getElementById('project-featured').checked, // <-- TAMBAHKAN INI
                            createdAt: new Date()
                        };

                        const projectId = document.getElementById('project-id').value;
                        if (projectId) {
                            const projectDoc = doc(db, 'projects', projectId);
                            const existingDoc = await getDoc(projectDoc);
                            const existingData = existingDoc.data();
                            projectData.galleryImageUrls = [...(existingData.galleryImageUrls || []), ...galleryImageUrls];
                            await updateDoc(projectDoc, projectData);
                        } else {
                            projectData.galleryImageUrls = galleryImageUrls;
                            await addDoc(projectsCollectionRef, projectData);
                        }

                        projectForm.reset();
                        document.getElementById('project-image-old-url').value = '';
                        await renderAdminProjects();
                    } catch (error) {
                        console.error("Error saving project: ", error);
                        alert("Gagal menyimpan proyek! Cek console untuk detail.");
                    } finally {
                        submitButton.disabled = false;
                        submitButton.textContent = 'Simpan Proyek';
                    }
                });

                adminProjectList.addEventListener('click', async (e) => {
                    const id = e.target.dataset.id;
                    if (!id) return;

                    const projectDocRef = doc(db, 'projects', id);

                    if (e.target.classList.contains('delete-btn')) {
                        Swal.fire({
                            title: 'Apakah Anda Yakin?',
                            text: "Proyek ini akan dihapus dari daftar. Aksi ini tidak bisa dibatalkan.",
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: '#3085d6',
                            cancelButtonColor: '#d33',
                            confirmButtonText: 'Ya, hapus!',
                            cancelButtonText: 'Batal'
                        }).then(async (result) => {
                            if (result.isConfirmed) {
                                await deleteDoc(projectDocRef);
                                await renderAdminProjects();
                                Swal.fire(
                                    'Dihapus!',
                                    'Proyek Anda telah berhasil dihapus.',
                                    'success'
                                );
                            }
                        });
                    }

                    if (e.target.classList.contains('edit-btn')) {
                        const docSnap = await getDoc(projectDocRef);
                        if (docSnap.exists()) {
                            const project = docSnap.data();
                            document.getElementById('project-id').value = id;
                            document.getElementById('project-title').value = project.title;
                            tinymce.get('project-description').setContent(project.description || '');
                            document.getElementById('project-link').value = project.link;
                            document.getElementById('project-category').value = project.category || '';
                            document.getElementById('project-image-old-url').value = project.mainImageUrl;
                            document.getElementById('project-featured').checked = project.isFeatured || false; // <-- TAMBAHKAN INI

                            window.scrollTo(0, 0);
                        }
                    }
                });

                renderAdminProjects();

            } else {
                // PENGGUNA TIDAK LOGIN
                Swal.fire({
                    title: 'Akses Ditolak',
                    text: 'Anda harus login untuk mengakses halaman ini.',
                    icon: 'warning',
                    confirmButtonText: 'OK'
                }).then(() => {
                    window.location.href = 'login.html';
                });
            }
        });
    }
});