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
```bash
docker-compose up -d
```

To wszystko! Docker automatycznie:
- Pobierze gotowe obrazy z DockerHub
- Stworzy bazę danych
- Uruchomi całą aplikację
- Pamiętaj o tym, że Docker musi być uruchomiony

### 3. Otwórz w przeglądarce
```
http://localhost
```

## Zatrzymanie aplikacji

```bash
docker-compose down
```

## Restart

```bash
docker-compose restart
```

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