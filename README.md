# Hemma

Rita ditt hem i 2D och 3D – och styr det smarta hemmet från samma ställe.

- **Bygg:** rum, väggar, dörrar, fönster (rullgardin/persienn), kök, möbler, belysning, media, utomhus. Mått och färger per sak. Bakgrundsbild med kalibrering.
- **Styr:** lampor (ljusstyrka), dörrar/portar (öppen/stängd), gardiner, TV/högtalare, scener.
- **Foto:** 📷 i 3D räknar fram en realistisk bild av vyn (path tracing i webbläsaren: riktigt ljus, skuggor, speglingar), dag eller kväll med de lampor som är tända. Spara som PNG.
- **Koppling:** Home Assistant (WebSocket-API) som nav för Apple Home, Homey, Hue, IKEA, Sonos m.fl.

Kör: valfri statisk webbserver, t.ex. `python3 -m http.server` och öppna http://localhost:8000. Ingen byggprocess; Three.js laddas från CDN.
Data sparas i webbläsaren (localStorage) och kan sparas/öppnas som fil.

## Synk mellan dina enheter

Husen kan följa med mellan arbetsdatorn, hemdatorn och mobilen. De sparas som filen `hemma.json` i ett **privat** GitHub-repo som bara du kan läsa. Varje enhet har kvar en egen kopia i webbläsaren. Därför fungerar appen även utan nät och synkar när nätet kommer tillbaka. Varje sparning blir en version i repot, så det går att gå tillbaka till ett äldre läge.

**Första gången (en gång, på arbetsdatorn där huset finns):**
1. Skapa ett nytt repo på https://github.com/new, till exempel `hemma-data`. Välj **Private**.
2. Skapa en nyckel på https://github.com/settings/personal-access-tokens/new:
   - *Repository access:* **Only select repositories** och välj `hemma-data`.
   - *Permissions → Repository permissions → Contents:* **Read and write**.
   - *Expiration:* välj till exempel ett år och skriv upp när den går ut.
3. Öppna Hemma, klicka på **☁️ Synk mellan enheter** i vänstermenyn och klistra in repot (`Kimmen1993/hemma-data`) och nyckeln.
   Klicka på **Koppla**. Huset laddas upp, och det här är flytten av ditt befintliga hus.

**Logga in på en ny enhet:**
- **Mobil:** På en dator som redan är kopplad öppnar du ☁️ Synk mellan enheter och klickar på **Koppla mobil (QR)**. Skanna QR-koden med mobilens kamera och välj **Hämta från GitHub**.
- **Annan dator:** Klicka på **Kopiera länk** på en kopplad enhet och öppna länken på den nya enheten, till exempel via AirDrop. Du kan också klistra in repo och nyckel för hand som i steg 3.
- Det som redan fanns på den nya enheten sparas som reservkopia. Välj **Behåll båda** om du vill lägga ihop husen.

**Bra att veta:**
- **Var nyckeln sparas:** Bara i webbläsaren på varje enhet, aldrig i koden. QR-koden och länken innehåller nyckeln, så visa dem inte för andra.
- **Om något läcker:** Ta bort nyckeln på GitHub under *Settings → Developer settings → Fine-grained tokens*. Skapa en ny och koppla om enheterna.
- **Två enheter samtidigt:** Ändringar slås ihop per vägg, möbel, rum och hem. Har samma sak ändrats på båda enheterna gäller den enhet som sparar sist, och du får en notis.
- **Hur ofta:** Ändringar skickas cirka 6 sekunder efter att du har slutat ändra. Andra enheter hämtar dem inom cirka 20 sekunder, eller direkt när du går tillbaka till fliken.
- **Det som inte synkas:** Home Assistant-adressen och dess nyckel stannar på varje enhet.
- **Styrningen:** Lampor och andra prylar styrs som vanligt i Homey-appen, som har egna användare för hushållet.

