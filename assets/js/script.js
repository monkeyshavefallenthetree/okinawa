/**
 * Okinawa E-commerce - Main JavaScript
 * All functionality for the e-commerce website
 */

// ===========================
// FIREBASE CONFIGURATION
// ===========================
const firebaseConfig = {
    apiKey: "AIzaSyDzitihiLQetctKmv2-VLTvbZfftB3zOmw",
    authDomain: "okinawa-e5948.firebaseapp.com",
    projectId: "okinawa-e5948",
    storageBucket: "okinawa-e5948.firebasestorage.app",
    messagingSenderId: "1079558060579",
    appId: "1:1079558060579:web:93b7cc521ec819205bcf96",
    measurementId: "G-9GLB5N0GS2"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// ===========================
// GLOBAL VARIABLES
// ===========================
let currentUser = null;
let cart = JSON.parse(localStorage.getItem('okinawa-cart')) || [];
let isEnglish = true;
let searchProducts = [];
let searchTimeout = null;

// ===========================
// AUTHENTICATION FUNCTIONS
// ===========================

/**
 * Register a new user
 */
async function registerUser(event) {
    event.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const phone = document.getElementById('register-phone').value;
    const address = document.getElementById('register-address').value;
    
    try {
        // Create user account
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Update display name
        await user.updateProfile({
            displayName: name
        });
        
        // Save user data to Firestore
        await db.collection('users').doc(user.uid).set({
            fullName: name,
            email: email,
            phone: phone,
            address: address,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('Account created successfully!', 'success');
        closeModal('register');
        
    } catch (error) {
        console.error('Registration error:', error);
        showToast(error.message, 'error');
    }
}

/**
 * Login user
 */
async function loginUser(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        showToast('Welcome back!', 'success');
        closeModal('login');
    } catch (error) {
        console.error('Login error:', error);
        showToast(error.message, 'error');
    }
}

/**
 * Logout user
 */
async function logout() {
    try {
        await auth.signOut();
        showToast('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error);
    }
}

/**
 * Update authentication UI based on user state
 */
function updateAuthUI(user) {
    currentUser = user;
    const authButtons = document.getElementById('auth-buttons');
    const userInfo = document.getElementById('user-info');
    const mobileAuth = document.getElementById('mobile-auth');
    
    if (user) {
        // User is logged in - Hide login buttons, show user info
        if (authButtons) {
            authButtons.style.display = 'none';
        }
        if (userInfo) {
            userInfo.style.display = 'flex';
        }
        
        const userName = document.getElementById('user-name');
        if (userName) {
            userName.textContent = user.displayName || user.email.split('@')[0];
        }
        
        // Update mobile auth
        if (mobileAuth) {
            mobileAuth.innerHTML = `
                <button onclick="showDashboard()" class="w-full px-4 py-2 text-primary hover:bg-gray-50 rounded-lg transition-colors font-medium text-left">
                    <i class="fas fa-user-circle mr-2"></i>My Account
                </button>
                <button onclick="logout()" class="w-full px-4 py-2 border border-primary text-primary hover:bg-primary hover:text-white rounded-lg transition-colors font-medium">
                    <i class="fas fa-sign-out-alt mr-2"></i>Logout
                </button>
            `;
        }
    } else {
        // User is logged out - Show login buttons, hide user info
        if (authButtons) {
            authButtons.style.display = 'flex';
        }
        if (userInfo) {
            userInfo.style.display = 'none';
        }
        
        // Update mobile auth
        if (mobileAuth) {
            mobileAuth.innerHTML = `
                <button onclick="openModal('login')" class="w-full px-4 py-2 text-primary hover:bg-gray-50 rounded-lg transition-colors font-medium text-left">Login</button>
                <button onclick="openModal('register')" class="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primaryDark transition-colors font-medium">Register</button>
            `;
        }
    }
}

// ===========================
// MODAL FUNCTIONS
// ===========================

/**
 * Open a modal
 */
function openModal(modalName) {
    const modal = document.getElementById(`${modalName}-modal`);
    if (modal) {
        modal.classList.remove('hidden');
    }
}

/**
 * Close a modal
 */
function closeModal(modalName) {
    const modal = document.getElementById(`${modalName}-modal`);
    if (modal) {
        modal.classList.add('hidden');
    }
}

/**
 * Switch between modals
 */
function switchModal(fromModal, toModal) {
    closeModal(fromModal);
    openModal(toModal);
}

// ===========================
// CART FUNCTIONS
// ===========================

/**
 * Toggle cart sidebar
 */
function toggleCart() {
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartOverlay = document.getElementById('cart-overlay');
    
    cartSidebar.classList.toggle('active');
    cartOverlay.classList.toggle('hidden');
    
    if (cartSidebar.classList.contains('active')) {
        updateCartDisplay();
    }
}

/**
 * Initialize hero image carousel
 */
async function initHeroCarousel() {
    const carousel = document.querySelector('[data-hero-carousel]');
    if (!carousel) return;

    const track = carousel.querySelector('[data-hero-track]');
    const slides = Array.from(track?.children || []);
    const dots = Array.from(carousel.querySelectorAll('[data-hero-dot]'));

    if (!track || slides.length === 0) return;

    const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/1600x600?text=Okinawa+Showcase';

    const resolveImageSource = async (candidates = []) => {
        const cleanedCandidates = [];

        candidates.forEach(candidate => {
            if (!candidate) return;
            const trimmed = candidate.trim();
            if (!trimmed) return;
            cleanedCandidates.push(trimmed);

            // If the candidate doesn't contain an extension, add likely ones
            if (!/\.(png|jpg|jpeg|webp|avif|gif)$/i.test(trimmed)) {
                cleanedCandidates.push(`${trimmed}.png`);
                cleanedCandidates.push(`${trimmed}.jpg`);
                cleanedCandidates.push(`${trimmed}.jpeg`);
            }
        });

        for (const src of cleanedCandidates) {
            try {
                const loadSucceeded = await new Promise(resolve => {
                    const testImage = new Image();
                    testImage.onload = () => resolve(true);
                    testImage.onerror = () => resolve(false);
                    testImage.src = src;
                });

                if (loadSucceeded) {
                    return src;
                }
            } catch (error) {
                console.warn('Failed to test hero image candidate:', src, error);
            }
        }

        return null;
    };

    await Promise.all(slides.map(async (slide) => {
        const imageElement = slide.querySelector('[data-hero-image]');
        const placeholderElement = slide.querySelector('[data-hero-placeholder]');

        let candidates = [];
        const rawCandidates = slide.getAttribute('data-image-set');

        if (rawCandidates) {
            try {
                const parsed = JSON.parse(rawCandidates);
                candidates = Array.isArray(parsed) ? parsed : [];
            } catch (error) {
                console.warn('Unable to parse hero image candidate list:', error);
            }
        }

        // Provide fallback combinations if none were supplied
        if (!candidates.length) {
            const altBase = slide.dataset?.imageBase || '';
            if (altBase) {
                candidates = [
                    `assets/img/${altBase}.png`,
                    `assets/img/${altBase}.jpg`,
                    `assets/${altBase}.png`,
                    `assets/${altBase}.jpg`,
                    `${altBase}.png`,
                    `${altBase}.jpg`
                ];
            }
        }

        const resolvedSource = await resolveImageSource(candidates);
        const finalSource = resolvedSource || PLACEHOLDER_IMAGE;

        if (imageElement) {
            imageElement.src = finalSource;
            imageElement.classList.remove('hidden');
        }

        if (placeholderElement) {
            placeholderElement.remove();
        }
    }));

    if (slides.length <= 1) {
        dots.forEach((dot, dotIndex) => {
            dot.classList.toggle('hidden', dotIndex > 0);
            if (dotIndex === 0) {
                dot.classList.add('bg-primary', 'border-primary', 'w-6');
            }
        });
        return;
    }

    let currentIndex = 0;
    let intervalId;
    const AUTO_PLAY_INTERVAL = 6000;

    const setActiveDot = (dot, isActive) => {
        dot.classList.toggle('bg-primary', isActive);
        dot.classList.toggle('border-primary', isActive);
        dot.classList.toggle('w-6', isActive);

        dot.classList.toggle('bg-white/60', !isActive);
        dot.classList.toggle('border-white/50', !isActive);
        dot.classList.toggle('w-2.5', !isActive);
    };

    const updateSlidePosition = (index) => {
        currentIndex = index;
        track.style.transform = `translateX(-${index * 100}%)`;
        dots.forEach((dot, dotIndex) => setActiveDot(dot, dotIndex === index));
    };

    const moveToNext = () => {
        const nextIndex = (currentIndex + 1) % slides.length;
        updateSlidePosition(nextIndex);
    };

    const startAutoPlay = () => {
        intervalId = window.setInterval(moveToNext, AUTO_PLAY_INTERVAL);
    };

    const stopAutoPlay = () => {
        if (intervalId) {
            window.clearInterval(intervalId);
            intervalId = null;
        }
    };

    dots.forEach((dot, index) => {
        dot.classList.remove('hidden');
        dot.addEventListener('click', () => {
            stopAutoPlay();
            updateSlidePosition(index);
            startAutoPlay();
        });
    });

    carousel.addEventListener('mouseenter', stopAutoPlay);
    carousel.addEventListener('mouseleave', () => {
        stopAutoPlay();
        startAutoPlay();
    });

    updateSlidePosition(0);
    startAutoPlay();
}

function closeCart() {
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartOverlay = document.getElementById('cart-overlay');
    
    cartSidebar.classList.remove('active');
    cartOverlay.classList.add('hidden');
}

/**
 * Add item to cart
 */
function addToCart(productId, productName, productPrice, productImage) {
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: productId,
            name: productName,
            price: parseFloat(productPrice),
            image: productImage,
            quantity: 1
        });
    }
    
    saveCart();
    updateCartCounts();
    updateCartDisplay();
    showToast('Added to cart!', 'success');
}

/**
 * Remove item from cart
 */
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartCounts();
    updateCartDisplay();
    showToast('Removed from cart', 'info');
}

/**
 * Update item quantity in cart
 */
function updateCartQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    
    if (item) {
        item.quantity += change;
        
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            saveCart();
            updateCartCounts();
            updateCartDisplay();
        }
    }
}

/**
 * Save cart to localStorage
 */
function saveCart() {
    localStorage.setItem('okinawa-cart', JSON.stringify(cart));
}

/**
 * Update cart count displays
 */
function updateCartCounts() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    const cartCount = document.getElementById('cart-count');
    const fabCartCount = document.getElementById('fab-cart-count');
    
    if (cartCount) cartCount.textContent = totalItems;
    if (fabCartCount) fabCartCount.textContent = totalItems;
}

/**
 * Update cart items display
 */
function updateCartDisplay() {
    const cartItems = document.getElementById('cart-items');
    const cartFooter = document.getElementById('cart-footer');
    const cartTotal = document.getElementById('cart-total');
    
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="text-center py-12 text-gray-400">
                <i class="fas fa-shopping-cart text-6xl mb-4"></i>
                <p class="text-lg">Your cart is empty</p>
            </div>
        `;
        cartFooter.classList.add('hidden');
    } else {
        let total = 0;
        cartItems.innerHTML = cart.map(item => {
            total += item.price * item.quantity;
            return `
                <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-lg mb-4">
                    <img src="${item.image || 'https://via.placeholder.com/60'}" alt="${item.name}" class="w-16 h-16 object-cover rounded-lg">
                    <div class="flex-1">
                        <h3 class="font-medium text-gray-900">${item.name}</h3>
                        <p class="text-sm text-primary font-semibold">$${item.price.toFixed(2)}</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="updateCartQuantity('${item.id}', -1)" class="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors">
                            <i class="fas fa-minus text-xs"></i>
                        </button>
                        <span class="w-8 text-center font-medium">${item.quantity}</span>
                        <button onclick="updateCartQuantity('${item.id}', 1)" class="w-8 h-8 bg-primary hover:bg-primaryDark text-white rounded-full flex items-center justify-center transition-colors">
                            <i class="fas fa-plus text-xs"></i>
                        </button>
                    </div>
                    <button onclick="removeFromCart('${item.id}')" class="text-red-500 hover:text-red-600 transition-colors">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        }).join('');
        
        cartTotal.textContent = `$${total.toFixed(2)}`;
        cartFooter.classList.remove('hidden');
    }
}

// ===========================
// PRODUCT FUNCTIONS
// ===========================

/**
 * Load products from Firestore
 */
// Cache products to avoid multiple fetches
let cachedProducts = null;
let cacheTime = 0;
const CACHE_DURATION = 60000; // 1 minute cache

async function loadProducts(forceRefresh = false) {
    try {
        // Return cached products if still fresh
        if (!forceRefresh && cachedProducts && (Date.now() - cacheTime) < CACHE_DURATION) {
            console.log('Using cached products');
            return cachedProducts;
        }
        
        console.log('Fetching products from Firestore...');
        const snapshot = await db.collection('products').limit(50).get(); // Limit for better performance
        const products = [];
        
        snapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });
        
        // Cache the products
        cachedProducts = products;
        cacheTime = Date.now();
        
        return products;
    } catch (error) {
        console.error('Error loading products:', error);
        return [];
    }
}

/**
 * Load new arrivals
 */
async function loadNewArrivals() {
    const startTime = Date.now();
    console.log('Loading new arrivals...');
    showLoadingSkeleton('new-arrivals-grid', 8);
    
    try {
        const products = await loadProducts();
        const newArrivals = products
            .filter(p => p.isNewArrival === true)
            .slice(0, 8);
        
        displayProducts(newArrivals, 'new-arrivals-grid');
        console.log(`New arrivals loaded in ${Date.now() - startTime}ms`);
    } catch (error) {
        console.error('Error loading new arrivals:', error);
    }
}

/**
 * Load best selling products
 */
async function loadBestSelling() {
    const startTime = Date.now();
    console.log('Loading best sellers...');
    showLoadingSkeleton('best-selling-grid', 8);
    
    try {
        const products = await loadProducts();
        const bestSelling = products
            .filter(p => p.isBestSeller === true)
            .slice(0, 8);
        
        displayProducts(bestSelling, 'best-selling-grid');
        console.log(`Best sellers loaded in ${Date.now() - startTime}ms`);
    } catch (error) {
        console.error('Error loading best sellers:', error);
    }
}

/**
 * Show loading skeleton
 */
function showLoadingSkeleton(containerId, count = 8) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const skeleton = `
        <div class="bg-white rounded-2xl shadow-lg overflow-hidden animate-pulse">
            <div class="aspect-square bg-gray-200"></div>
            <div class="p-4 space-y-2">
                <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                <div class="h-6 bg-gray-200 rounded w-1/2"></div>
            </div>
        </div>
    `;
    
    container.innerHTML = Array(count).fill(skeleton).join('');
}

/**
 * Display products in grid
 */
function displayProducts(products, containerId) {
    const container = document.getElementById(containerId);
    
    if (!container) return;
    
    if (products.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-400">
                <p class="text-lg">No products found</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = products.map(product => {
        const price = product.sellPrice || product.price || 0;
        return `
            <div class="product-card bg-white rounded-2xl shadow-lg overflow-hidden group cursor-pointer" onclick="window.location.href='product.html?id=${product.id}'">
                <div class="relative overflow-hidden aspect-square bg-gray-100">
                    <img src="${product.image || 'https://via.placeholder.com/300'}" 
                         alt="${product.name}" 
                         loading="lazy"
                         class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                         onerror="this.src='https://via.placeholder.com/300?text=No+Image'">
                    ${product.isNewArrival ? '<div class="absolute top-2 left-2 badge badge-new">New</div>' : ''}
                    ${product.isBestSeller ? '<div class="absolute top-2 right-2 badge badge-best">Best Seller</div>' : ''}
                </div>
                <div class="p-4 space-y-2">
                    <h3 class="font-semibold text-gray-900 text-lg line-clamp-2">${product.name}</h3>
                    <div class="flex items-center justify-between">
                        <span class="text-2xl font-bold text-primary">$${price.toFixed(2)}</span>
                        <button 
                            onclick="event.stopPropagation(); addToCart('${product.id}', '${product.name}', ${price}, '${product.image}')" 
                            class="px-4 py-2 bg-primary text-white rounded-full hover:bg-primaryDark transition-colors">
                            <i class="fas fa-cart-plus"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ===========================
// SEARCH FUNCTIONS
// ===========================

/**
 * Initialize search functionality
 */
async function initSearch() {
    const searchInput = document.getElementById('main-search');
    const dropdown = document.getElementById('search-dropdown');
    
    if (!searchInput || !dropdown) return;
    
    // Load products for search
    searchProducts = await loadProducts();
    
    // Add event listeners
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('focus', handleSearchFocus);
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });
}

/**
 * Handle search input
 */
function handleSearchInput(e) {
    const searchTerm = e.target.value.trim();
    
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    if (searchTerm.length < 1) {
        document.getElementById('search-dropdown').classList.add('hidden');
        return;
    }
    
    searchTimeout = setTimeout(() => {
        performSearch(searchTerm);
    }, 300);
}

/**
 * Handle search focus
 */
function handleSearchFocus(e) {
    const searchTerm = e.target.value.trim();
    if (searchTerm.length >= 1) {
        performSearch(searchTerm);
    }
}

/**
 * Perform search
 */
function performSearch(searchTerm) {
    const filtered = searchProducts.filter(product => {
        const name = (product.name || '').toLowerCase();
        const category = (product.category || '').toLowerCase();
        const term = searchTerm.toLowerCase();
        
        return name.includes(term) || category.includes(term);
    });
    
    displaySearchResults(filtered);
}

/**
 * Display search results
 */
function displaySearchResults(products) {
    const dropdown = document.getElementById('search-dropdown');
    const resultsContainer = document.getElementById('search-results');
    
    if (!dropdown || !resultsContainer) return;
    
    if (products.length === 0) {
        resultsContainer.innerHTML = `
            <div class="p-4 text-center text-gray-400">
                <i class="fas fa-search text-3xl mb-2"></i>
                <p>No products found</p>
            </div>
        `;
    } else {
        resultsContainer.innerHTML = products.slice(0, 8).map(product => {
            const price = product.sellPrice || product.price || 0;
            return `
                <div class="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer transition-colors" onclick="window.location.href='product.html?id=${product.id}'">
                    <img src="${product.image || 'https://via.placeholder.com/50'}" 
                         alt="${product.name}" 
                         class="w-12 h-12 object-cover rounded-lg"
                         onerror="this.src='https://via.placeholder.com/50'">
                    <div class="flex-1">
                        <h4 class="font-medium text-gray-900">${product.name}</h4>
                        <p class="text-sm text-primary font-semibold">$${price.toFixed(2)}</p>
                    </div>
                    <i class="fas fa-arrow-right text-gray-400"></i>
                </div>
            `;
        }).join('');
    }
    
    dropdown.classList.remove('hidden');
}

// ===========================
// UTILITY FUNCTIONS
// ===========================

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="flex items-center gap-2">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Toggle mobile menu
 */
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    const menuIcon = document.getElementById('mobile-menu-icon');
    
    mobileMenu.classList.toggle('hidden');
    mobileMenu.classList.toggle('active');
    
    if (mobileMenu.classList.contains('active')) {
        menuIcon.classList.remove('fa-bars');
        menuIcon.classList.add('fa-times');
    } else {
        menuIcon.classList.remove('fa-times');
        menuIcon.classList.add('fa-bars');
    }
}

/**
 * Toggle language
 */
function toggleLanguage() {
    isEnglish = !isEnglish;
    const langText = document.getElementById('lang-text');
    
    if (langText) {
        langText.textContent = isEnglish ? 'EN' : 'AR';
    }
    
    document.documentElement.setAttribute('dir', isEnglish ? 'ltr' : 'rtl');
    localStorage.setItem('okinawa-language', isEnglish ? 'en' : 'ar');
    
    // Implement full translation here if needed
    showToast(`Language switched to ${isEnglish ? 'English' : 'Arabic'}`, 'info');
}

/**
 * Show dashboard (placeholder)
 */
function showDashboard() {
    // Redirect to profile page
    window.location.href = 'profile.html';
}

/**
 * Open checkout
 */
function openCheckout() {
    if (cart.length === 0) {
        showToast('Your cart is empty!', 'error');
        return;
    }
    
    // Populate checkout modal with cart items
    const checkoutItems = document.getElementById('checkout-items');
    const checkoutTotal = document.getElementById('checkout-total');
    
    let html = '';
    let total = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        html += `
            <div class="flex justify-between text-sm">
                <span>${item.name} x ${item.quantity}</span>
                <span class="font-semibold">$${itemTotal.toFixed(2)}</span>
            </div>
        `;
    });
    
    checkoutItems.innerHTML = html;
    checkoutTotal.textContent = `$${total.toFixed(2)}`;
    
    // Pre-fill user data if logged in
    const user = firebase.auth().currentUser;
    if (user) {
        document.getElementById('checkout-email').value = user.email || '';
        
        // Load user's default address
        firebase.firestore()
            .collection('addresses')
            .where('userId', '==', user.uid)
            .get()
            .then(snapshot => {
                // Find default address in JavaScript (no index needed)
                const defaultAddress = snapshot.docs.find(doc => doc.data().isDefault === true);
                if (defaultAddress) {
                    const address = defaultAddress.data();
                    document.getElementById('checkout-name').value = address.fullName || '';
                    document.getElementById('checkout-phone').value = address.phoneNumber || '';
                    document.getElementById('checkout-street').value = address.street || '';
                    document.getElementById('checkout-city').value = address.city || '';
                    document.getElementById('checkout-state').value = address.state || '';
                    document.getElementById('checkout-postal').value = address.postalCode || '';
                }
            });
    }
    
    // Show modal
    document.getElementById('checkout-modal').classList.remove('hidden');
    closeCart();
}

function closeCheckout() {
    document.getElementById('checkout-modal').classList.add('hidden');
    document.getElementById('checkout-form').reset();
    document.getElementById('instapay-details').classList.add('hidden');
}

// ===========================
// INITIALIZATION
// ===========================

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Initializing Okinawa E-commerce...');
    
    // Load language preference
    const savedLang = localStorage.getItem('okinawa-language');
    if (savedLang === 'ar') {
        isEnglish = false;
        document.getElementById('lang-text').textContent = 'AR';
        document.documentElement.setAttribute('dir', 'rtl');
    }
    
    // Initialize cart
    updateCartCounts();
    updateCartDisplay();
    
    // Initialize search
    await initSearch();
    
    // Load products
    await Promise.all([
        loadNewArrivals(),
        loadBestSelling()
    ]);
    
    // Initialize hero carousel
    await initHeroCarousel();

    // Set up auth state listener
    auth.onAuthStateChanged(updateAuthUI);
    
    // Set up form event listeners
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', loginUser);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', registerUser);
    }
    
    // Close modals when clicking outside
    document.querySelectorAll('[id$="-modal"]').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });
    
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });
    
    // Payment method toggle for checkout
    const paymentRadios = document.querySelectorAll('input[name="payment-method"]');
    const instapayDetails = document.getElementById('instapay-details');
    const instapayReference = document.getElementById('instapay-reference');
    
    if (paymentRadios.length > 0 && instapayDetails && instapayReference) {
        paymentRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.value === 'instapay') {
                    instapayDetails.classList.remove('hidden');
                    instapayReference.required = true;
                } else {
                    instapayDetails.classList.add('hidden');
                    instapayReference.required = false;
                }
            });
        });
    }
    
    // Handle checkout form submission
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        console.log('Checkout form found, attaching submit handler');
        checkoutForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('=== CHECKOUT FORM SUBMITTED ===');
            console.log('Cart contents:', cart);
            console.log('Cart length:', cart.length);
            
            // Verify Firebase is initialized
            if (!firebase.apps.length) {
                alert('Firebase is not initialized! Check your configuration.');
                return;
            }
            console.log('Firebase is initialized');
            
            const user = firebase.auth().currentUser;
            if (!user) {
                console.log('User not logged in');
                showToast('Please login to place an order', 'error');
                closeCheckout();
                openModal('login');
                return;
            }
            console.log('User logged in:', user.uid);
            console.log('User email:', user.email);
            
            const placeOrderBtn = document.getElementById('place-order-btn');
            placeOrderBtn.disabled = true;
            placeOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
            
            try {
                // Get form data
                const paymentMethod = document.querySelector('input[name="payment-method"]:checked')?.value;
                if (!paymentMethod) {
                    throw new Error('Please select a payment method');
                }
                
                const orderData = {
                    userId: user.uid,
                    userEmail: user.email,
                    customerInfo: {
                        fullName: document.getElementById('checkout-name')?.value || '',
                        phone: document.getElementById('checkout-phone')?.value || '',
                        email: document.getElementById('checkout-email')?.value || ''
                    },
                    deliveryAddress: {
                        street: document.getElementById('checkout-street')?.value || '',
                        city: document.getElementById('checkout-city')?.value || '',
                        state: document.getElementById('checkout-state')?.value || '',
                        postalCode: document.getElementById('checkout-postal')?.value || ''
                    },
                    items: cart.map(item => ({
                        productId: item.id,
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                        image: item.image,
                        total: item.price * item.quantity
                    })),
                    paymentMethod: paymentMethod,
                    paymentStatus: paymentMethod === 'cash' ? 'pending' : 'awaiting_confirmation',
                    orderStatus: 'pending',
                    notes: document.getElementById('checkout-notes')?.value || '',
                    totalAmount: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
                    date: firebase.firestore.FieldValue.serverTimestamp(),
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                // Add instapay reference if applicable
                if (paymentMethod === 'instapay') {
                    const instapayRef = document.getElementById('instapay-reference')?.value;
                    if (!instapayRef) {
                        throw new Error('Please enter Instapay transaction reference');
                    }
                    orderData.instapayReference = instapayRef;
                }
                
                // Save order to Firestore
                console.log('=== ORDER DATA TO BE SAVED ===');
                console.log(JSON.stringify(orderData, null, 2));
                console.log('Attempting to save to Firestore...');
                
                const orderRef = await firebase.firestore().collection('orders').add(orderData);
                
                console.log('✅ Order saved successfully! Order ID:', orderRef.id);
                
                // Clear cart
                cart = [];
                localStorage.removeItem('cart');
                saveCart();
                updateCartCounts();
                updateCartDisplay();
                
                // Close modal and show success
                closeCheckout();
                showToast('Order placed successfully! Order ID: ' + orderRef.id.substring(0, 8).toUpperCase(), 'success');
                
                // Optionally redirect to profile/orders page
                setTimeout(() => {
                    window.location.href = 'profile.html#orders';
                }, 2000);
                
            } catch (error) {
                console.error('Error placing order:', error);
                console.error('Error details:', {
                    message: error.message,
                    code: error.code,
                    stack: error.stack
                });
                showToast('Failed to place order: ' + error.message, 'error');
                alert('Error details: ' + error.message + '\nCheck console for more info.');
                placeOrderBtn.disabled = false;
                placeOrderBtn.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Place Order';
            }
        });
    }
    
    console.log('Okinawa E-commerce initialized successfully!');
});

// Add slideOut animation for toast
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }
`;
document.head.appendChild(style);

