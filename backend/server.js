const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());
app.use(cors()); // Pozwala przeglądarce łączyć się z tym serwerem

// Konfiguracja połączenia z bazą danych
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',      // Domyślny użytkownik w XAMPP
    password: '',      // Domyślne hasło w XAMPP jest puste
    database: 'ticket_db'
});

// Sprawdzenie połączenia
db.connect(err => {
    if (err) {
        console.error('Błąd połączenia z bazą:', err);
    } else {
        console.log('Sukces! Połączono z bazą MySQL.');
    }
});

// API - Pobieranie wydarzeń z dynamiczną ceną minimalną
app.get('/api/events', (req, res) => {
    // Łączymy tabelę events z tabelą seats, aby znaleźć najniższą cenę (MIN)
    // bierzemy pod uwagę tylko miejsca DOSTĘPNE (status = 'available')
    const sql = `
        SELECT events.*, MIN(seats.price) as dynamic_min_price
        FROM events
        LEFT JOIN seats ON events.id = seats.event_id AND seats.status = 'available'
        GROUP BY events.id
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Endpoint do pobierania JEDNEGO wydarzenia po ID
app.get('/api/events/:id', (req, res) => {
    const id = req.params.id; // Pobieramy ID z adresu URL
    const sql = 'SELECT * FROM events WHERE id = ?';
    
    db.query(sql, [id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (result.length === 0) {
            return res.status(404).json({ message: 'Nie znaleziono wydarzenia' });
        }
        res.json(result[0]); // Zwracamy pierwszy (i jedyny) wynik
    });
});

// Endpoint do pobierania miejsc dla konkretnego wydarzenia
app.get('/api/events/:id/seats', (req, res) => {
    const eventId = req.params.id;
    // ZMIANA: Sortujemy najpierw po sekcji, potem rzędzie i numerze
    // DESC przy sekcji sprawi, że 'VIP' (V) będzie przed 'Standard' (S)
    const sql = 'SELECT * FROM seats WHERE event_id = ? ORDER BY section DESC, row_num, seat_num';
    
    db.query(sql, [eventId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Endpoint do pobierania statystyk wydarzenia (liczba miejsc i cena min)
app.get('/api/events/:id/stats', (req, res) => {
    const eventId = req.params.id;

    // Zapytanie, które liczy wolne miejsca i szuka najniższej ceny
    const sql = `
        SELECT 
            COUNT(*) as availableCount, 
            MIN(price) as minPrice 
        FROM seats 
        WHERE event_id = ? AND status = 'available'
    `;

    db.query(sql, [eventId], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        // Zwracamy wynik (jeśli brak miejsc, minPrice będzie null, więc dajemy 0)
        res.json({
            availableCount: result[0].availableCount,
            minPrice: result[0].minPrice || 0
        });
    });
});

// Endpoint do składania zamówienia (KUPNO BILETÓW)
app.post('/api/book', async (req, res) => {
    const { eventId, seatIds, totalPrice, userId, guestInfo } = req.body;

    // Walidacja miejsc
    if (!seatIds || seatIds.length === 0) {
        return res.status(400).json({ error: 'Nie wybrano miejsc' });
    }

    let finalUserId = userId;

    // JEŚLI KUPUJE GOŚĆ (brak userId, ale jest guestInfo)
    if (!finalUserId && guestInfo) {
        const { firstName, lastName, email } = guestInfo;

        if (!email || !firstName || !lastName) {
            return res.status(400).json({ error: 'Proszę uzupełnić dane kontaktowe (Imię, Nazwisko, Email)' });
        }

        try {
            // 1. Sprawdź, czy taki email już jest w bazie
            const checkUserSql = 'SELECT id FROM users WHERE email = ?';
            const [existingUsers] = await db.promise().query(checkUserSql, [email]);

            if (existingUsers.length > 0) {
                // Użytkownik już istnieje - przypisujemy zamówienie do niego
                finalUserId = existingUsers[0].id;
            } else {
                // 2. Tworzymy nowego użytkownika "w tle"
                // Generujemy losowe hasło, bo to konto gościa (nie zaloguje się nim, chyba że zresetuje hasło)
                const randomPassword = Math.random().toString(36).slice(-8);
                const hashedPassword = await bcrypt.hash(randomPassword, 10);

                const insertUserSql = 'INSERT INTO users (first_name, last_name, email, password) VALUES (?, ?, ?, ?)';
                const [newUserResult] = await db.promise().query(insertUserSql, [firstName, lastName, email, hashedPassword]);
                
                finalUserId = newUserResult.insertId;
            }
        } catch (err) {
            console.error('Błąd obsługi użytkownika-gościa:', err);
            return res.status(500).json({ error: 'Błąd przetwarzania danych osobowych' });
        }
    }

    // Ostateczne zabezpieczenie
    if (!finalUserId) {
        return res.status(400).json({ error: 'Błąd identyfikacji użytkownika' });
    }

    // --- DALEJ STARA LOGIKA REZERWACJI ---
    
    // 1. Tworzymy zamówienie
    const insertBookingSql = 'INSERT INTO bookings (user_id, event_id, total_price) VALUES (?, ?, ?)';
    
    db.query(insertBookingSql, [finalUserId, eventId, totalPrice], (err, result) => {
        if (err) {
            console.error('Błąd SQL (booking):', err);
            return res.status(500).json({ error: 'Błąd tworzenia zamówienia' });
        }

        const bookingId = result.insertId;

        // 2. Aktualizujemy status miejsc
        const updateSeatsSql = 'UPDATE seats SET status = "taken", booking_id = ? WHERE id IN (?)';
        
        // Przekazujemy [bookingId, seatIds]
        db.query(updateSeatsSql, [bookingId, seatIds], (updateErr, updateResult) => {
            if (updateErr) {
                console.error('Błąd SQL (seats):', updateErr);
                return res.status(500).json({ error: 'Błąd aktualizacji miejsc' });
            }

            console.log(`Sprzedano bilety. Zamówienie nr: ${bookingId} dla UserID: ${finalUserId || 'Gość'}`);
            res.json({ message: 'Rezerwacja udana', bookingId: bookingId });
        });
    });
});

// ===== REJESTRACJA =====
app.post('/api/register', async (req, res) => {
    const { firstName, lastName, email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email i hasło są wymagane' });
    }

    // 1. Sprawdź, czy taki email już istnieje
    const checkSql = 'SELECT * FROM users WHERE email = ?';
    db.query(checkSql, [email], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (results.length > 0) {
            return res.status(400).json({ error: 'Taki użytkownik już istnieje' });
        }

        // 2. Zaszyfruj hasło
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Zapisz użytkownika
        const insertSql = 'INSERT INTO users (first_name, last_name, email, password) VALUES (?, ?, ?, ?)';
        db.query(insertSql, [firstName, lastName, email, hashedPassword], (err, result) => {
            if (err) return res.status(500).json({ error: 'Błąd rejestracji' });
            
            res.json({ message: 'Rejestracja udana! Możesz się zalogować.' });
        });
    });
});

// ===== LOGOWANIE =====
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    const sql = 'SELECT * FROM users WHERE email = ?';
    db.query(sql, [email], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Jeśli nie znaleziono usera LUB hasło się nie zgadza
        if (results.length === 0) {
            return res.status(401).json({ error: 'Nieprawidłowy email lub hasło' });
        }

        const user = results[0];

        // Porównaj hasło podane przez użytkownika z tym zaszyfrowanym w bazie
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: 'Nieprawidłowy email lub hasło' });
        }

        // Sukces! Zwracamy dane użytkownika (bez hasła!)
        res.json({
            message: 'Zalogowano pomyślnie',
            user: {
                id: user.id,
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email
            }
        });
    });
});

// ===== MOJE BILETY =====
app.get('/api/user/:userId/bookings', (req, res) => {
    const userId = req.params.userId;

    // Używamy GROUP_CONCAT, aby skleić wszystkie miejsca w jeden ładny napis
    // Np. "Parter - Rząd 1, Miejsce 5; Parter - Rząd 1, Miejsce 6"
    const sql = `
        SELECT 
            bookings.id, 
            bookings.total_price, 
            bookings.booking_date, 
            events.title, 
            events.date, 
            events.location, 
            events.image_url,
            GROUP_CONCAT(
                CONCAT(seats.section, ' - Rząd ', seats.row_num, ', Miejsce ', seats.seat_num) 
                SEPARATOR '; '
            ) as seat_details
        FROM bookings
        JOIN events ON bookings.event_id = events.id
        LEFT JOIN seats ON seats.booking_id = bookings.id
        WHERE bookings.user_id = ?
        GROUP BY bookings.id
        ORDER BY bookings.booking_date DESC
    `;

    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Błąd pobierania biletów' });
        }
        res.json(results);
    });
});

// Start serwera
app.listen(3000, () => {
    console.log('Serwer działa pod adresem http://localhost:3000');
});