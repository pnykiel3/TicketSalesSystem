// ============================================================================
// KONFIGURACJA I STAŁE
// ============================================================================

const API_BASE_URL = 'http://localhost:3000/api';
const DATE_FORMAT_OPTIONS = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
};

// ============================================================================
// ZMIENNE GLOBALNE  
// ============================================================================

let allEventsData = [];
let selectedSeats = [];
let currentPaymentMethod = null;

// Nieużywane, ale zachowane dla kompatybilności
const seatPrices = { 'VIP': 249, 'Parter': 149, 'Balkon': 89 };

// ============================================================================
// FUNKCJE POMOCNICZE (UTILITIES)
// ============================================================================

/**
 * Pobiera zalogowanego użytkownika z localStorage
 * @returns {Object|null} Obiekt użytkownika lub null
 */
function getCurrentUser() {
    const userJson = localStorage.getItem('currentUser');
    return userJson ? JSON.parse(userJson) : null;
}

/**
 * Formatuje datę na spo

łeczny format polski
 * @param {Date|string} date - Data do sformatowania
 * @returns {string} Sformatowana data
 */
function formatEventDate(date) {
    return new Date(date).toLocaleDateString('pl-PL', DATE_FORMAT_OPTIONS);
}

/**
 * Formatuje cenę
 * @param {number} price - Cena do sformatowania
 * @returns {string} Sformatowana cena
 */
function formatPrice(price) {
    return `${price.toFixed(2)} zł`;
}

// ============================================================================
// API - POBIERANIE WYDARZEŃ
// ============================================================================

/**
 * Ładuje wydarzenia na stronę główną (grid view)
 */
async function loadEvents() {
    try {
        const response = await fetch(`${API_BASE_URL}/events`);
        const events = await response.json();
        const container = document.getElementById('events-container');

        if (!container) return;

        container.innerHTML = events.map(event => createEventCardHTML(event)).join('');
    } catch (error) {
        console.error('Błąd pobierania wydarzeń:', error);
        showError('events-container', 'Nie udało się załadować wydarzeń.');
    }
}

/**
 * Ładuje wszystkie wydarzenia do widoku listy z filtrami
 */
async function loadAllEventsPage() {
    try {
        const response = await fetch(`${API_BASE_URL}/events`);
        allEventsData = await response.json();
        renderEventsList(allEventsData);
    } catch (error) {
        console.error('Błąd ładowania listy wydarzeń:', error);
    }
}

/**
 * Otwiera szczegóły wybranego wydarzenia
 * @param {number} id - ID wydarzenia
 */
async function openEventDetails(id) {
    try {
        const [event, stats] = await Promise.all([
            fetch(`${API_BASE_URL}/events/${id}`).then(r => r.json()),
            fetch(`${API_BASE_URL}/events/${id}/stats`).then(r => r.json())
        ]);

        window.currentEvent = event;
        window.currentEventId = id;

        updateEventDetailsUI(event, stats);
        showScreen('event-details');
    } catch (error) {
        console.error('Błąd ładowania szczegółów:', error);
    }
}

/**
 * Ładuje mapę miejsc dla wydarzenia
 * @param {number} eventId - ID wydarzenia
 */
async function loadSeats(eventId) {
    selectedSeats = [];
    updateSelectedSeatsDisplay();

    const response = await fetch(`${API_BASE_URL}/events/${eventId}/seats`);
    const seats = await response.json();
    const container = document.getElementById('seats-container');

    if (seats.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:20px;">Brak mapy miejsc.</p>';
        return;
    }

    // Aktualizuj tytuł wydarzenia i datę w nagłówku
    if (window.currentEvent) {
        const titleElement = document.querySelector('#seat-selection h1');
        const subtitleElement = document.querySelector('#seat-selection .subtitle');

        if (titleElement) {
            titleElement.textContent = 'Wybór miejsc';
        }

        if (subtitleElement) {
            const eventDate = new Date(window.currentEvent.date).toLocaleDateString('pl-PL', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            subtitleElement.textContent = `${window.currentEvent.title} • ${eventDate}`;
        }
    }

    renderSeatsMap(seats, container);
    showScreen('seat-selection');
}

// ============================================================================
// GENEROWANIE HTML
// ============================================================================

/**
 * Tworzy HTML dla karty wydarzenia
 */
function createEventCardHTML(event) {
    const date = formatEventDate(event.date);
    const price = event.dynamic_min_price || event.price;

    return `
        <div class="event-card" onclick="openEventDetails(${event.id})">
            <div class="event-image" style="background-image: url('${event.image_url}'); background-size: cover; background-position: center;">
                <span class="event-badge">${event.category || 'Wydarzenie'}</span>
            </div>
            <div class="event-info">
                <h3 class="event-title">${event.title}</h3>
                <p class="event-location">📍 ${event.location}</p>
                <p class="event-date">🗓️ ${date}</p>
                <div class="event-footer">
                    <span class="event-price">od ${price} zł</span>
                    <button class="btn-small">Kup bilet</button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Tworzy HTML dla elementu listy wydarzeń
 */
function createEventListItemHTML(event) {
    const date = formatEventDate(event.date);
    const price = event.dynamic_min_price || event.price;
    const desc = event.description ? event.description.substring(0, 150) + '...' : 'Brak opisu.';

    return `
        <div class="event-list-item" onclick="openEventDetails(${event.id})">
            <div class="event-list-image" style="background-image: url('${event.image_url}'); background-size: cover; background-position: center;"></div>
            <div class="event-list-content">
                <div>
                    <span class="event-category">${event.category || 'Inne'}</span>
                    <h3>${event.title}</h3>
                    <p class="event-meta">📍 ${event.location} • 🗓️ ${date}</p>
                    <p class="event-description">${desc}</p>
                </div>
                <div class="event-list-action">
                    <span class="price-large">od ${price} zł</span>
                    <button class="btn-primary">Zobacz szczegóły</button>
                </div>
            </div>
        </div>
    `;
}

// ============================================================================
// RENDEROWANIE WIDOKÓW
// ============================================================================

/**
 * Renderuje listę wydarzeń
 * @param {Array} events - Tablica wydarzeń do wyświetlenia
 */
function renderEventsList(events) {
    const container = document.getElementById('all-events-container');
    const countLabel = document.getElementById('events-count');

    if (!container) return;

    if (countLabel) {
        countLabel.textContent = `Znaleziono ${events.length} wydarzeń`;
    }

    if (events.length === 0) {
        container.innerHTML = '<p style="padding:20px; text-align:center;">Brak wydarzeń spełniających kryteria.</p>';
        return;
    }

    container.innerHTML = events.map(event => createEventListItemHTML(event)).join('');
}

/**
 * Aktualizuje UI szczegółów wydarzenia
 */
function updateEventDetailsUI(event, stats) {
    const heroElement = document.getElementById('detail-hero');
    heroElement.style.background = `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url('${event.image_url}')`;
    heroElement.style.backgroundSize = 'cover';
    heroElement.style.backgroundPosition = 'center';

    document.getElementById('detail-title').textContent = event.title;
    document.getElementById('detail-subtitle').textContent = event.category || 'Wydarzenie';
    document.getElementById('detail-location').textContent = event.location;
    document.getElementById('detail-category').textContent = event.category || 'Inne';
    document.getElementById('detail-duration').textContent = event.duration || 'Nie podano';
    document.getElementById('detail-description').textContent = event.description || 'Brak opisu.';

    const dateObj = new Date(event.date);
    const dateStr = dateObj.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('detail-date').innerHTML = `${dateStr}<br><span>Godz. ${timeStr}</span>`;

    const programContainer = document.getElementById('detail-program');
    if (event.program) {
        programContainer.innerHTML = event.program.split('\n').map(line => `<li>${line}</li>`).join('');
    } else {
        programContainer.innerHTML = '<li>Szczegółowy program wkrótce.</li>';
    }

    const countLabel = document.getElementById('stats-count');
    const priceLabel = document.getElementById('stats-price');

    if (stats.availableCount > 0) {
        countLabel.textContent = stats.availableCount;
        priceLabel.textContent = `${stats.minPrice} zł`;
    } else {
        countLabel.textContent = 'Wyprzedane';
        countLabel.style.color = 'var(--error)';
        countLabel.style.background = 'rgba(239, 68, 68, 0.1)';
        priceLabel.textContent = '-';
    }
}

/**
 * Renderuje mapę miejsc
 */
function renderSeatsMap(seats, container) {
    const sections = {};

    seats.forEach(seat => {
        if (!sections[seat.section]) sections[seat.section] = {};
        if (!sections[seat.section][seat.row_num]) sections[seat.section][seat.row_num] = [];
        sections[seat.section][seat.row_num].push(seat);
    });

    container.innerHTML = '';

    for (const sectionName in sections) {
        container.innerHTML += `<div class="section-label">${sectionName}</div>`;
        const rows = sections[sectionName];

        for (const rowNum in rows) {
            const rowSeats = rows[rowNum];
            let rowHTML = `<div class="seat-row"><span class="row-label">${rowNum}</span>`;

            rowSeats.forEach(seat => {
                const statusClass = seat.status === 'taken' ? 'taken' : 'available';
                rowHTML += `
                    <div class="seat ${statusClass}" 
                         data-id="${seat.id}" 
                         data-price="${seat.price}"
                         data-row="${seat.row_num}"
                         data-seat="${seat.seat_num}"
                         data-section="${seat.section}"
                         onclick="handleSeatClick(this)"
                         title="Rząd ${seat.row_num}, Miejsce ${seat.seat_num} (${seat.price} zł)">
                    </div>
                `;
            });

            rowHTML += `</div>`;
            container.innerHTML += rowHTML;
        }
    }
}

// ============================================================================
// FILTROWANIE WYDARZEŃ
// ============================================================================

/**
 * Aplikuje filtry do listy wydarzeń
 */
function applyFilters() {
    const searchText = document.getElementById('filter-search')?.value.toLowerCase() || '';
    const city = document.getElementById('filter-city')?.value || '';
    const selectedCategories = Array.from(document.querySelectorAll('.category-checkbox:checked')).map(cb => cb.value.toLowerCase());
    const minPrice = parseFloat(document.getElementById('filter-price-min').value) || 0;
    const maxPrice = parseFloat(document.getElementById('filter-price-max').value) || 999999;

    const filtered = allEventsData.filter(event => {
        const matchesSearch = !searchText ||
            event.title.toLowerCase().includes(searchText) ||
            (event.description && event.description.toLowerCase().includes(searchText));

        const matchesCity = !city || event.location.includes(city);

        const eventCat = (event.category || '').toLowerCase();
        const matchesCategory = selectedCategories.length === 0 || selectedCategories.some(sel => eventCat.includes(sel));

        const realPrice = event.dynamic_min_price || event.price;
        const matchesPrice = realPrice >= minPrice && realPrice <= maxPrice;

        return matchesSearch && matchesCity && matchesCategory && matchesPrice;
    });

    renderEventsList(filtered);
}

/**
 * Obsługuje wyszukiwanie ze strony głównej
 */
function handleHomeSearch() {
    const homeSearch = document.getElementById('home-search-input').value;
    const homeCategory = document.getElementById('home-category-select').value;
    const homeCity = document.getElementById('home-city-select').value;

    showScreen('events');

    if (allEventsData.length === 0) {
        loadAllEventsPage().then(() => setFiltersAndApply(homeSearch, homeCategory, homeCity));
    } else {
        setFiltersAndApply(homeSearch, homeCategory, homeCity);
    }
}

/**
 * Ustawia filtry w sidebarze i aplikuje
 */
function setFiltersAndApply(search, category, city) {
    document.getElementById('filter-search').value = search;
    document.getElementById('filter-city').value = city;

    const checkboxes = document.querySelectorAll('.category-checkbox');

    if (category) {
        checkboxes.forEach(cb => cb.checked = cb.value === category);
    } else {
        checkboxes.forEach(cb => cb.checked = true);
    }

    applyFilters();
}

/**
 * Resetuje wszystkie filtry
 */
function resetFilters() {
    document.querySelectorAll('.category-checkbox').forEach(cb => cb.checked = true);
    document.getElementById('filter-price-min').value = '';
    document.getElementById('filter-price-max').value = '';
    document.getElementById('filter-search').value = '';
    document.getElementById('filter-city').value = '';
    renderEventsList(allEventsData);
}

// ============================================================================
// WYBÓR MIEJSC
// ============================================================================

/**
 * Obsługuje kliknięcie w miejsce
 */
function handleSeatClick(seatElement) {
    if (seatElement.classList.contains('taken')) return;

    const seatData = {
        dbId: seatElement.dataset.id,
        section: seatElement.dataset.section,
        row: seatElement.dataset.row,
        seat: seatElement.dataset.seat,
        price: parseFloat(seatElement.dataset.price)
    };

    if (seatElement.classList.contains('selected')) {
        seatElement.classList.remove('selected');
        seatElement.classList.add('available');
        selectedSeats = selectedSeats.filter(s => s.dbId !== seatData.dbId);
    } else {
        seatElement.classList.remove('available');
        seatElement.classList.add('selected');
        selectedSeats.push(seatData);
    }

    updateSelectedSeatsDisplay();
}

/**
 * Aktualizuje wyświetlanie wybranych miejsc
 */
function updateSelectedSeatsDisplay() {
    const container = document.getElementById('selected-seats');
    const countEl = document.getElementById('ticket-count');
    const totalEl = document.getElementById('total-price');
    const continueBtn = document.getElementById('continue-btn');

    if (selectedSeats.length === 0) {
        container.innerHTML = '<p class="empty-state">Nie wybrano jeszcze żadnych miejsc</p>';
        countEl.textContent = '0';
        totalEl.textContent = '0 zł';
        continueBtn.disabled = true;
        return;
    }

    let total = 0;
    const seatsHTML = selectedSeats.map(seat => {
        total += seat.price;
        return `
            <div class="seat-item">
                <div class="seat-info">
                    <strong>${seat.section}</strong>
                    <span>Rząd ${seat.row}, Miejsce ${seat.seat}</span>
                </div>
                <span class="seat-price">${seat.price} zł</span>
            </div>
        `;
    }).join('');

    container.innerHTML = seatsHTML;
    countEl.textContent = selectedSeats.length;
    totalEl.textContent = `${total} zł`;
    continueBtn.disabled = false;
}

// ============================================================================
// KOSZYK
// ============================================================================

/**
 * Aktualizuje ekran koszyka
 */
function updateCartScreen() {
    if (!window.currentEvent || selectedSeats.length === 0) {
        alert("Koszyk jest pusty!");
        showScreen('events');
        return;
    }

    document.getElementById('cart-event-title').textContent = window.currentEvent.title;
    const date = new Date(window.currentEvent.date).toLocaleDateString('pl-PL');
    document.getElementById('cart-event-meta').textContent = `📍 ${window.currentEvent.location} • 🗓️ ${date}`;

    const container = document.getElementById('cart-tickets-container');
    let total = 0;

    container.innerHTML = selectedSeats.map(seat => {
        total += seat.price;
        return `
            <div class="ticket-item">
                <div>
                    <strong>${seat.section} - Rząd ${seat.row}, Miejsce ${seat.seat}</strong>
                    <p class="text-muted">Bilet normalny</p>
                </div>
                <div class="cart-item-right">
                    <span class="ticket-price">${seat.price} zł</span>
                    <button class="btn-remove-ticket" onclick="removeSeatFromCart('${seat.dbId}')">Usuń</button>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('cart-summary-count').textContent = `Bilety (${selectedSeats.length} szt.)`;
    document.getElementById('cart-summary-subtotal').textContent = formatPrice(total);
    document.getElementById('cart-total-final').textContent = formatPrice(total);

    showScreen('cart');
}

/**
 * Usuwa bilet z koszyka
 */
function removeSeatFromCart(seatId) {
    // Znajdź miejsce w tablicy przed usunięciem
    const seatToRemove = selectedSeats.find(seat => seat.dbId === seatId);

    // Usuń z tablicy
    selectedSeats = selectedSeats.filter(seat => seat.dbId !== seatId);

    // Odznacz w UI (jeśli ekran wyboru miejsc jest załadowany)
    if (seatToRemove) {
        const seatElement = document.querySelector(`.seat[data-id="${seatId}"]`);
        if (seatElement) {
            seatElement.classList.remove('selected');
            seatElement.classList.add('available');
        }
    }

    // Odśwież panel po prawej stronie
    updateSelectedSeatsDisplay();

    if (selectedSeats.length === 0) {
        clearCart();
    } else {
        updateCartScreen();
    }
}

/**
 * Czyści koszyk i odznacza wszystkie miejsca
 */
function clearCart() {
    // Odznacz wszystkie miejsca w UI
    selectedSeats.forEach(seat => {
        const seatElement = document.querySelector(`.seat[data-id="${seat.dbId}"]`);
        if (seatElement) {
            seatElement.classList.remove('selected');
            seatElement.classList.add('available');
        }
    });

    selectedSeats = [];
    showScreen('events');
}

// ============================================================================
// PŁATNOŚĆ
// ============================================================================

/**
 * Aktualizuje ekran płatności
 */
function updatePaymentScreen() {
    if (!window.currentEvent || selectedSeats.length === 0) {
        showScreen('events');
        return;
    }

    document.getElementById('pay-event-title').textContent = window.currentEvent.title;
    const date = new Date(window.currentEvent.date).toLocaleDateString('pl-PL');
    document.getElementById('pay-event-meta').textContent = `${date}, ${window.currentEvent.location}`;

    const container = document.getElementById('pay-tickets-list');
    let total = 0;

    container.innerHTML = selectedSeats.map(seat => {
        total += seat.price;
        return `
            <div class="ticket-line">
                <span>${seat.section} (R${seat.row}, M${seat.seat})</span>
                <span>${seat.price} zł</span>
            </div>
        `;
    }).join('');

    document.getElementById('pay-total').textContent = formatPrice(total);

    const user = getCurrentUser();
    const guestBox = document.querySelector('.guest-info-box');

    if (user) {
        if (guestBox) guestBox.style.display = 'none';
        document.getElementById('pay-firstname').value = user.firstName || '';
        document.getElementById('pay-lastname').value = user.lastName || '';
        document.getElementById('pay-email').value = user.email || '';
    } else {
        if (guestBox) guestBox.style.display = 'flex';
        document.getElementById('pay-firstname').value = '';
        document.getElementById('pay-lastname').value = '';
        document.getElementById('pay-email').value = '';
    }

    showScreen('payment');
}

/**
 * Przetwarza płatność
 */
async function processPayment() {
    if (!validatePaymentForm()) return;
    if (!validatePaymentMethod()) return;

    showProcessingModal();

    setTimeout(async () => {
        await submitPaymentToBackend();
    }, 3000);
}

/**
 * Waliduje formularz płatności
 */
function validatePaymentForm() {
    const fName = document.getElementById('pay-firstname').value.trim();
    const lName = document.getElementById('pay-lastname').value.trim();
    const email = document.getElementById('pay-email').value.trim();

    if (!isValidName(fName)) {
        alert("Wpisz poprawne imię (minimum 2 litery).");
        document.getElementById('pay-firstname').focus();
        return false;
    }

    if (!isValidName(lName)) {
        alert("Wpisz poprawne nazwisko (minimum 2 litery).");
        document.getElementById('pay-lastname').focus();
        return false;
    }

    if (!isValidEmail(email)) {
        alert("Wpisz poprawny adres e-mail.");
        document.getElementById('pay-email').focus();
        return false;
    }

    return true;
}

/**
 * Waliduje metodę płatności
 */
function validatePaymentMethod() {
    if (!currentPaymentMethod) {
        alert("Wybierz metodę płatności (BLIK lub Karta).");
        return false;
    }

    if (currentPaymentMethod === 'blik') {
        const code = document.getElementById('blik-code').value;
        if (!isValidBlik(code)) {
            alert("Kod BLIK  musi składać się z dokładnie 6 cyfr.");
            document.getElementById('blik-code').focus();
            return false;
        }
    }

    if (currentPaymentMethod === 'card') {
        const num = document.getElementById('card-number').value;
        const expiry = document.getElementById('card-expiry').value;
        const cvc = document.getElementById('card-cvc').value;

        if (!isValidCardNumber(num)) {
            alert("Numer karty jest nieprawidłowy (wymagane 16 cyfr).");
            document.getElementById('card-number').focus();
            return false;
        }

        if (!isValidExpiryDate(expiry)) {
            alert("Data ważności jest nieprawidłowa lub karta wygasła (format MM/RR).");
            document.getElementById('card-expiry').focus();
            return false;
        }

        if (!isValidCVC(cvc)) {
            alert("Kod CVC musi składać się z 3 cyfr.");
            document.getElementById('card-cvc').focus();
            return false;
        }
    }

    return true;
}

/**
 * Wysyła dane płatności do backendu
 */
async function submitPaymentToBackend() {
    const user = getCurrentUser();
    const seatIdsToBook = selectedSeats.map(seat => seat.dbId);
    const totalText = document.getElementById('pay-total').textContent;
    const totalPrice = parseFloat(totalText.replace(/[^\d\.]/g, ''));

    const orderData = {
        eventId: window.currentEventId,
        seatIds: seatIdsToBook,
        totalPrice: totalPrice,
        userId: user ? user.id : null,
        guestInfo: {
            firstName: document.getElementById('pay-firstname').value.trim(),
            lastName: document.getElementById('pay-lastname').value.trim(),
            email: document.getElementById('pay-email').value.trim()
        }
    };

    try {
        const response = await fetch(`${API_BASE_URL}/book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();
        removeProcessingModal();

        if (response.ok) {
            showSuccessModal();
            selectedSeats = [];
        } else {
            alert('Błąd rezerwacji: ' + result.error);
        }
    } catch (error) {
        removeProcessingModal();
        console.error('Błąd:', error);
        alert('Błąd połączenia z serwerem.');
    }
}

/**
 * Wybiera metodę płatności
 */
function selectPaymentMethod(method) {
    currentPaymentMethod = method;
    document.querySelectorAll('.payment-option').forEach(el => el.classList.remove('active'));
    document.getElementById(`opt-${method}`).classList.add('active');
    document.getElementById('form-blik').style.display = 'none';
    document.getElementById('form-card').style.display = 'none';
    document.getElementById(`form-${method}`).style.display = 'block';
}

// Formatowanie pól płatności
function formatBlik(input) {
    input.value = input.value.replace(/\D/g, '').substring(0, 6);
}

function formatCard(input) {
    let value = input.value.replace(/\D/g, '');
    let formatted = '';
    for (let i = 0; i < value.length; i++) {
        if (i > 0 && i % 4 === 0) formatted += ' ';
        formatted += value[i];
    }
    input.value = formatted.substring(0, 19);
}

function formatDate(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length >= 2) {
        input.value = value.substring(0, 2) + '/' + value.substring(2, 4);
    } else {
        input.value = value;
    }
}

// ============================================================================
// MODALS
// ============================================================================

function showProcessingModal() {
    const modal = document.createElement('div');
    modal.id = 'processing-modal';
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:20000; display:flex; flex-direction:column; align-items:center; justify-content:center;';
    modal.innerHTML = `
        <div class="spinner"></div>
        <h3 style="color:white; margin-top:20px;">Autoryzacja płatności...</h3>
        <p style="color:#aaa; font-size:14px;">Prosimy nie zamykać okna.</p>
    `;
    document.body.appendChild(modal);
}

function removeProcessingModal() {
    const modal = document.getElementById('processing-modal');
    if (modal) modal.remove();
}

function showSuccessModal() {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:10000;';
    modal.innerHTML = `
        <div style="background:#1e293b; border:1px solid #334155; border-radius:16px; padding:48px; max-width:500px; text-align:center;">
            <h2 style="color:#f1f5f9;">Płatność udana!</h2>
            <p style="color:#94a3b8;">Bilety przypisane do Twojego konta.</p>
            <button onclick="window.location.reload()" style="background:#6366f1; color:white; border:none; padding:16px 32px; border-radius:12px; font-weight:600; cursor:pointer;">OK</button>
        </div>
    `;
    document.body.appendChild(modal);
}

function showError(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = `<p>${message}</p>`;
}

// ============================================================================
// UWIERZYTELNIANIE
// ============================================================================

/**
 * Obsługuje rejestrację
 */
async function handleRegister() {
    const firstName = document.getElementById('firstname').value;
    const lastName = document.getElementById('lastname').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (password !== confirmPassword) {
        alert("Hasła nie są identyczne!");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName, lastName, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            alert("Konto założone! Zaloguj się.");
            showScreen('login');
        } else {
            alert("Błąd: " + data.error);
        }
    } catch (error) {
        console.error(error);
        alert("Błąd połączenia z serwerem");
    }
}

/**
 * Obsługuje logowanie
 */
async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            alert(`Witaj, ${data.user.firstName}!`);
            updateNavAfterLogin();
            showScreen('home');
        } else {
            alert("Błąd: " + data.error);
        }
    } catch (error) {
        console.error(error);
        alert("Błąd logowania");
    }
}

/**
 * Obsługuje wylogowanie
 */
function handleLogout() {
    localStorage.removeItem('currentUser');
    alert("Wylogowano.");
    window.location.reload();
}

/**
 * Aktualizuje nawigację po zalogowaniu
 */
function updateNavAfterLogin() {
    const user = getCurrentUser();
    const navActions = document.querySelector('.nav-actions');
    const navLinks = document.getElementById('nav-links-container');

    let linksHTML = `
        <a href="#" onclick="showScreen('home')">Strona główna</a>
        <a href="#" onclick="showScreen('events'); loadAllEventsPage();">Wydarzenia</a>
    `;

    if (user) {
        const initials = user.firstName.charAt(0) + user.lastName.charAt(0);
        navActions.innerHTML = `
            <button class="btn-secondary" onclick="openMyAccount()" style="display:flex; align-items:center; gap:10px; padding:8px 16px;">
                <div style="width:28px; height:28px; background:var(--primary); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:bold; color:white;">
                    ${initials}
                </div>
                Moje konto
            </button>
        `;
    } else {
        navActions.innerHTML = `
            <button class="btn-secondary" onclick="showScreen('login')">Zaloguj się</button>
            <button class="btn-primary" onclick="showScreen('register')">Zarejestruj się</button>
        `;
    }

    navLinks.innerHTML = linksHTML;
}

// ============================================================================
// KONTO UŻYTKOWNIKA
// ============================================================================

/**
 * Otwiera panel konta użytkownika
 */
function openMyAccount() {
    const user = getCurrentUser();
    if (!user) {
        showScreen('login');
        return;
    }

    document.getElementById('account-name').textContent = `${user.firstName} ${user.lastName}`;
    document.getElementById('account-email').textContent = user.email;
    document.getElementById('account-avatar').textContent = user.firstName.charAt(0) + user.lastName.charAt(0);

    document.getElementById('profile-firstname').value = user.firstName;
    document.getElementById('profile-lastname').value = user.lastName;
    document.getElementById('profile-email').value = user.email;

    loadAccountTickets(user.id);
    switchAccountTab('tickets');
    showScreen('my-account');
}

/**
 * Przełącza zakładki w koncie
 */
function switchAccountTab(tabName) {
    document.querySelectorAll('.account-nav-item').forEach(btn => btn.classList.remove('active'));
    document.getElementById('tab-tickets').style.display = 'none';
    document.getElementById('tab-profile').style.display = 'none';

    if (tabName === 'tickets') {
        document.getElementById('tab-tickets').style.display = 'block';
        document.querySelector('.account-nav button:first-child').classList.add('active');
    } else if (tabName === 'profile') {
        document.getElementById('tab-profile').style.display = 'block';
        document.querySelector('.account-nav button:nth-child(2)').classList.add('active');
    }
}

/**
 * Ładuje bilety użytkownika
 */
async function loadAccountTickets(userId) {
    const container = document.getElementById('account-tickets-container');
    const user = getCurrentUser() || { firstName: 'Gość' };

    try {
        const response = await fetch(`${API_BASE_URL}/user/${userId}/bookings`);
        if (!response.ok) throw new Error(`Błąd serwera: ${response.status}`);

        const bookings = await response.json();

        if (bookings.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:40px; color:var(--text-secondary);">
                    <p style="font-size:40px; margin-bottom:10px;">🎫</p>
                    <p>Nie masz jeszcze żadnych biletów.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = bookings.map(booking => createTicketCardHTML(booking, user)).join('');
    } catch (error) {
        console.error("Błąd:", error);
        container.innerHTML = '<p style="color:var(--error); text-align:center;">Błąd wyświetlania biletów.</p>';
    }
}

/**
 * Tworzy HTML dla karty biletu
 */
function createTicketCardHTML(booking, user) {
    const eventDate = new Date(booking.date).toLocaleDateString('pl-PL');
    const seatsListHTML = booking.seat_details
        ? booking.seat_details.split('; ').map(s => `<div>💺 ${s}</div>`).join('')
        : '<div>Brak szczegółów miejsc</div>';

    const safeTitle = booking.title.replace(/'/g, "&#39;").replace(/"/g, "&quot;");
    const safeName = (user.firstName || 'Klient').replace(/'/g, "&#39;");

    return `
        <div class="ticket-card-small">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <h3 style="font-size:18px; margin-bottom:5px;">${booking.title}</h3>
                    <p style="color:var(--text-secondary); font-size:14px; margin-bottom:8px;">
                        📍 ${booking.location} • 🗓️ ${eventDate}
                    </p>
                    <div style="font-size:13px; color:var(--primary); background:rgba(99,102,241,0.1); padding:8px; border-radius:6px; margin-bottom:10px;">
                        ${seatsListHTML}
                    </div>
                </div>
                <span class="event-badge" style="background:var(--success); color:white;">Opłacone</span>
            </div>
            <div class="qr-placeholder">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:13px; color:var(--text-muted);">Zamówienie #${booking.id} • ${booking.total_price} zł</span>
                    <button class="btn-qr" onclick="openQRModal('${booking.id}', '${safeTitle}', '${safeName}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="7" height="7"></rect>
                            <rect x="14" y="3" width="7" height="7"></rect>
                            <rect x="14" y="14" width="7" height="7"></rect>
                            <rect x="3" y="14" width="7" height="7"></rect>
                        </svg>
                        Pokaż kod QR
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Otwiera modal z kodem QR
 */
function openQRModal(bookingId, eventTitle, userName) {
    const modal = document.getElementById('qr-modal');
    const qrImage = document.getElementById('qr-image');
    const ticketLabel = document.getElementById('qr-ticket-id');

    modal.style.display = 'flex';

    const cleanTitle = eventTitle.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    const cleanUser = userName.replace(/&quot;/g, '"').replace(/&#39;/g, "'");

    const qrDataObj = {
        id: bookingId,
        e: cleanTitle.substring(0, 30),
        u: cleanUser,
        v: 1
    };

    const qrString = encodeURIComponent(JSON.stringify(qrDataObj));
    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrString}&bgcolor=ffffff`;
    ticketLabel.textContent = `Zamówienie #${bookingId} • ${cleanUser}`;
}

function closeQRModal() {
    document.getElementById('qr-modal').style.display = 'none';
}

// ============================================================================
// WALIDATORY
// ============================================================================

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidName(name) {
    return /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ -]{2,}$/.test(name);
}

function isValidBlik(code) {
    return /^\d{6}$/.test(code.replace(/\s/g, ''));
}

function isValidCardNumber(number) {
    return /^\d{16}$/.test(number.replace(/\s/g, ''));
}

function isValidExpiryDate(date) {
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(date)) return false;

    const [month, year] = date.split('/').map(Number);
    const now = new Date();
    const currentYear = now.getFullYear() % 100;
    const currentMonth = now.getMonth() + 1;

    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;

    return true;
}

function isValidCVC(cvc) {
    return /^\d{3}$/.test(cvc);
}

// ============================================================================
// NAWIGACJA
// ============================================================================

/**
 * Przełącza ekrany
 */
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// ============================================================================
// INICJALIZACJA
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('TicketHub System Ready');
    updateNavAfterLogin();
    loadEvents();
    loadAllEventsPage();
});

document.getElementById('qr-modal').addEventListener('click', function (e) {
    if (e.target === this) closeQRModal();
});