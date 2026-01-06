# TicketHub

System do sprzedaży biletów online.

## Co to jest?

Aplikacja webowa do rezerwacji i sprzedaży biletów na wydarzenia. Zawiera:
- Frontend - strona internetowa
- Backend - API
- Baza danych MySQL

## Wymagania

- Docker Desktop ([pobierz tutaj](https://www.docker.com/products/docker-desktop/))

## Jak uruchomić?

### 1. Sklonuj repozytorium
```bash
git clone https://github.com/pnykiel3/TicketSalesSystem.git
cd TicketSalesSystem
```

### 2. Uruchom aplikację

**Zalecane** - użyj skryptu startowego (wyświetla linki dostępu):
```bash
./start.sh
```

Skrypt automatycznie:
- Uruchomi aplikację w tle
- Pokaże linki dostępu (localhost + IP w sieci)
- Wyświetli status kontenerów
- Pokaże pomocne komendy

**Alternatywnie** - standardowy Docker Compose:
```bash
docker-compose up -d
```

Docker automatycznie:
- Pobierze gotowe obrazy z DockerHub
- Stworzy bazę danych
- Uruchomi całą aplikację
- Pamiętaj o tym, że Docker musi być uruchomiony

### 3. Otwórz w przeglądarce

**Na tym urządzeniu:**
```
http://localhost
```

**Z innych urządzeń w sieci lokalnej:**
```
http://[TWOJE_IP]
```
_(IP zostanie wyświetlone po uruchomieniu `./start.sh`)_

## Zatrzymanie aplikacji

```bash
docker-compose down
```

## Restart

```bash
docker-compose restart
```

## Częste pytania (FAQ)

### Jak wygląda output skryptu start.sh?

Po uruchomieniu `./start.sh` zobaczysz:
```
🚀 Uruchamianie TicketHub...

✅ Aplikacja uruchomiona pomyślnie!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 Dostęp do aplikacji:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🖥️  Na tym urządzeniu:
   http://localhost

🌐 Z innych urządzeń w sieci:
   http://192.168.1.8

💡 Upewnij się, że firewall nie blokuje portu 80

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Jak uzyskać dostęp z telefonu/tabletu?

1. Uruchom aplikację używając `./start.sh`
2. Zanotuj IP wyświetlone w sekcji "Z innych urządzeń w sieci"
3. Na telefonie/tablecie w tej samej sieci WiFi otwórz przeglądarkę
4. Wpisz adres: `http://[WYŚWIETLONE_IP]` (np. `http://192.168.1.8`)

**Uwaga:** Upewnij się, że firewall na komputerze nie blokuje portu 80.

## Problemy?

### Port 80 zajęty
Edytuj `docker-compose.yml` i zmień linię:
```yaml
ports:
  - "8080:80"  # zmień 80 na 8080
```

Wtedy aplikacja będzie dostępna pod `http://localhost:8080`

### Sprawdzenie statusu
```bash
docker-compose ps
```

Wszystkie kontenery powinny być w stanie `Up`.

## Porty

- **80** - Frontend (strona internetowa)
- **3000** - Backend API
- **3306** - Baza danych MySQL

## Licencja

MIT