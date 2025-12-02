// ===== Screen Navigation System =====
function showScreen(screenId) {
    // Hide all screens
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show selected screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// ===== Seat Selection System =====
let selectedSeats = [];
const seatPrices = {
    'VIP': 249,
    'Parter': 149,
    'Balkon': 89
};

function toggleSeat(seatElement, section, row, seat) {
    // Check if seat is already taken
    if (seatElement.classList.contains('taken')) {
        return;
    }
    
    const seatId = `${section}-${row}-${seat}`;
    
    // Toggle selection
    if (seatElement.classList.contains('selected')) {
        // Deselect
        seatElement.classList.remove('selected');
        seatElement.classList.add('available');
        selectedSeats = selectedSeats.filter(s => s.id !== seatId);
    } else {
        // Select
        seatElement.classList.remove('available');
        seatElement.classList.add('selected');
        selectedSeats.push({
            id: seatId,
            section: section,
            row: row,
            seat: seat,
            price: seatPrices[section]
        });
    }
    
    updateSelectedSeatsDisplay();
}

function updateSelectedSeatsDisplay() {
    const selectedSeatsContainer = document.getElementById('selected-seats');
    const ticketCountElement = document.getElementById('ticket-count');
    const totalPriceElement = document.getElementById('total-price');
    const continueBtn = document.getElementById('continue-btn');
    
    if (selectedSeats.length === 0) {
        selectedSeatsContainer.innerHTML = '<p class="empty-state">Nie wybrano jeszcze żadnych miejsc</p>';
        ticketCountElement.textContent = '0';
        totalPriceElement.textContent = '0 zł';
        continueBtn.disabled = true;
    } else {
        // Build seats list
        let seatsHTML = '';
        let totalPrice = 0;
        
        selectedSeats.forEach(seat => {
            totalPrice += seat.price;
            seatsHTML += `
                <div class="seat-item">
                    <div class="seat-info">
                        <strong>${seat.section}</strong>
                        <span>Rząd ${seat.row}, Miejsce ${seat.seat}</span>
                    </div>
                    <span class="seat-price">${seat.price} zł</span>
                </div>
            `;
        });
        
        selectedSeatsContainer.innerHTML = seatsHTML;
        ticketCountElement.textContent = selectedSeats.length;
        totalPriceElement.textContent = `${totalPrice} zł`;
        continueBtn.disabled = false;
    }
}

// ===== Payment Success Modal =====
function showPaymentSuccess() {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease-in-out;
    `;
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        border: 1px solid #334155;
        border-radius: 16px;
        padding: 48px;
        max-width: 500px;
        text-align: center;
        box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.5);
    `;
    
    modalContent.innerHTML = `
        <div style="
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #10b981, #059669);
            border-radius: 50%;
            margin: 0 auto 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: scaleIn 0.5s ease-in-out;
        ">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <path d="M12 24l8 8 16-16" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </div>
        <h2 style="
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 12px;
            color: #f1f5f9;
        ">Płatność zakończona sukcesem!</h2>
        <p style="
            color: #94a3b8;
            font-size: 16px;
            margin-bottom: 32px;
            line-height: 1.6;
        ">Twoje bilety zostały wysłane na adres e-mail. Dziękujemy za zakup!</p>
        <button 
            onclick="this.closest('div').remove(); showScreen('home');"
            style="
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                color: white;
                border: none;
                padding: 16px 32px;
                border-radius: 12px;
                font-weight: 600;
                font-size: 16px;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.3);
            "
            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 10px 15px -3px rgb(0 0 0 / 0.3)';"
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px -1px rgb(0 0 0 / 0.3)';"
        >Powrót do strony głównej</button>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Close modal on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
            showScreen('home');
        }
    });
}

// ===== Add keyframe animations =====
const style = document.createElement('style');
style.textContent = `
    @keyframes scaleIn {
        from {
            transform: scale(0);
            opacity: 0;
        }
        to {
            transform: scale(1);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('Ticket Reservation System Prototype Loaded');
    console.log('Version: 1.0.0');
    console.log('This is a visual prototype - no backend functionality');
});
