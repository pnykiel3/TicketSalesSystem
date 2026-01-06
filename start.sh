#!/bin/bash

# Kolory do wyświetlania
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Uruchamianie TicketHub...${NC}"
echo ""

# Uruchom docker-compose
docker-compose up -d

# Sprawdź czy kontenery się uruchomiły
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Aplikacja uruchomiona pomyślnie!${NC}"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${YELLOW}📱 Dostęp do aplikacji:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Link lokalny
    echo -e "${GREEN}🖥️  Na tym urządzeniu:${NC}"
    echo "   http://localhost"
    echo ""
    
    # Pobierz IP lokalne (macOS)
    LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null)
    
    # Jeśli en0 nie działa, spróbuj en1 (WiFi)
    if [ -z "$LOCAL_IP" ]; then
        LOCAL_IP=$(ipconfig getifaddr en1 2>/dev/null)
    fi
    
    # Wyświetl IP sieciowe jeśli znaleziono
    if [ ! -z "$LOCAL_IP" ]; then
        echo -e "${GREEN}🌐 Z innych urządzeń w sieci:${NC}"
        echo "   http://${LOCAL_IP}"
        echo ""
        echo -e "${BLUE}💡 Upewnij się, że firewall nie blokuje portu 80${NC}"
    else
        echo -e "${YELLOW}⚠️  Nie udało się wykryć IP lokalnego${NC}"
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo -e "${BLUE}📊 Status kontenerów:${NC}"
    docker-compose ps
    echo ""
    echo -e "${BLUE}📝 Aby zobaczyć logi:${NC} docker-compose logs -f"
    echo -e "${BLUE}🛑 Aby zatrzymać:${NC}  docker-compose down"
    echo ""
else
    echo -e "${YELLOW}❌ Błąd podczas uruchamiania kontenerów${NC}"
    exit 1
fi
