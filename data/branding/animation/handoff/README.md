# Handoff: ChallengeGoal animasyonlu 3D logo

## Genel bakış
ChallengeGoal futbol quiz uygulaması için animasyonlu 3D futbol topu logosu. Üç varyant seçildi (hepsi **Klasik** renk, **topta isim açık**):

| # | Konsept | Düzen | Önizleme |
|---|---|---|---|
| 1 | Gol | Sadece top | `01-gol-sadece-top.html` |
| 2 | Kupa | Sadece top | `02-kupa-sadece-top.html` |
| 3 | Alev | Yatay (top + CHALLENGE GOAL yazısı) | `03-alev-yatay.html` |

## Tasarım dosyaları hakkında
Bu paketteki dosyalar **HTML ile hazırlanmış tasarım referanslarıdır** (three.js prototipi) — görünüm ve davranışı gösterir, doğrudan üretim kodu değildir. Görev: bu animasyonları hedef uygulamanın mevcut ortamında (React Native/Expo → `expo-gl` + `@react-three/fiber/native`; web → three.js / react-three-fiber; Flutter/Swift → video veya Lottie'ye çevirerek) yeniden oluşturmak. Tüm geometri prosedürel (görsel/doku dosyası yok, isim bandı canvas'ta çiziliyor), bu yüzden `Futbol Topu.html` içindeki kod doğrudan TS/JS bileşenlerine taşınabilir.

**Önizleme:** Klasörü bir yerel sunucuyla açın (`npx serve .`) ve preset dosyalarını açın. URL parametreleri: `?concept=Gol|Kupa|Alev|…&color=Klasik&layout=Sadece top|Yatay|Dikey&name=1&embed` (`embed` kontrol panelini gizler).

**Alternatif (en hızlı yol):** Uygulama içinde 3D gerekmiyorsa, her preset'i döngülü video (MP4/WebM, şeffaf için HEVC-alpha/WebM-alpha) olarak kaydedip oynatmak yeterli.

## Fidelity
Yüksek (hi-fi): renkler, oranlar, zamanlama nihai.

## Ortak öğeler
### Top
- Kesik ikosahedron (12 beşgen + 20 altıgen), yarıçap `R = 0.11` (sahne birimi). `IcosahedronGeometry(1, 56)` köşeleri, en yakın panel normaline göre sınıflandırılıp yastık şeklinde içe bastırılıyor (derinlik %2.2, dikiş girintisi %0.4).
- Malzemeler (MeshStandardMaterial):
  - Altıgen: `#f3f5f7`, roughness 0.4
  - Beşgen (Klasik): `#14181f`, roughness 0.3, metalness 0
  - Dikiş: `#0a0d12`, roughness 0.9
- Duruş: `rotation (-0.35, 0.55, 0.45)`. Sürekli dönüş: dünya ekseni `normalize(0.25, 1, -0.15)` etrafında **0.0012 rad/ms** (~0.19 tur/sn).

### Topta isim bandı
- Topu saran küre şeridi (yarıçap R×1.004, enlem genişliği 0.42 rad, boylam 2.3 rad), dönüş ekseninin ekvatoruna hizalı → top dönerken yazı akar.
- Doku: 1280×220 canvas; `#0a0d12` hap şekli (radius = yükseklik/2); metin **Barlow Condensed 900 italic 150px**: "CHALLENGE" `#f6f7f9` + "GOAL" `#c6ff1f`.

### Sahne
- Arka plan `#0a0d12`. Lime kontur ışığı: DirectionalLight `#c6ff1f` şiddet 3.2, konum (-4, 2, -5); PointLight `#c6ff1f` 0.6.
- Kuyruk/çizgi malzemesi: `#c6ff1f`, emissive aynı renk ×0.55. Beyaz vurgu: `#f3f5f7`, emissive ×0.15.
- Kuyruklar: CatmullRom tüp, uca doğru `(1 - u)^0.8` ile incelir (uçta %5), başta küre kapak.

## Varyant 1 — Gol (Sadece top)
- Kale: x = 0.24, yarı genişlik 0.3, yükseklik 0.36, derinlik 0.24. Direkler r = 0.007, beyaz `#f3f5f7`. Ağ: `#7d8696` çizgiler (8 dikey + 5 yatay bölüm).
- Top yolu: Quadratic Bezier A(-0.26, R, 0.03) → C(-0.02, 0.3, 0.02) → B(0.36, R+0.02, 0).
- Arkasında 5 lime kuyruk (uzunluklar 0.13/0.21/0.27/0.19/0.11), teğete göre döner.
- Döngü **2600 ms**: 0–55% top easeOut(quad) ile ağa gider; 50–100% ağ x ekseninde 1→1.25→1 sinüs esneme; direkler 0.9 → 0 lime emissive ile parlar; kuyruk 50–60% arası söner; 88–100% top küçülerek kaybolur, sonra baştan.

## Varyant 2 — Kupa (Sadece top)
- Kupa x = 0.2: koyu kaide `#141922` (r 0.068, h 0.05), lime şerit; gövde+kase lathe profili, kase üstü y = 0.322, iki yan kulp (torus r 0.038). Klasik'te kupa metali `#d9dde3` metalness 0.5.
- Pivot: kaidenin sağ alt kenarı (devrilme ekseni).
- Döngü **3200 ms**: 0–32% top kavisle gelip kaseye çarpar (y 0.25); çarpmadan sonra top geri seker (300 ms'lik yay); kupa `u²` hızlanmayla 86°'ye devrilir (26% süre), yere vurunca %6'lık sekme; 88–100% kupa doğrulur, top yeniden belirir.

## Varyant 3 — Alev (Yatay)
- Top x = 0.13; 5 dalgalı kuyruk, lime/beyaz dönüşümlü. Yön `(-1, -0.3, 0)`; uzunluklar 0.17/0.29/0.40/0.31/0.20.
- Her kuyruk noktasına yanal sapma: `sin(u·7 + faz + t·0.006) · 0.014 · u`, geometri ~40 ms'de bir yeniden üretilir (native'de shader/vertex güncellemesi önerilir).
- Yatay lockup: solda 3D top (kare alan), sağda wordmark "CHALLENGE" beyaz + "GOAL" lime, Barlow Condensed 900 italic, top ile yazı yaklaşık aynı yükseklikte.

## Tasarım tokenları
- `#0a0d12` arka plan / dikiş
- `#141922` koyu yüzey
- `#c6ff1f` lime vurgu
- `#f3f5f7` beyaz panel
- `#14181f` klasik beşgen
- `#d9dde3` kupa gümüş
- `#7d8696` ağ / ikincil metin
- Font: Barlow Condensed 900 italic (Google Fonts)

## Dosyalar
- `Futbol Topu.html` — tüm konseptleri içeren prototip (kaynak; `CONCEPTS` dizisinde Gol/Kupa/Alev `build()` fonksiyonları)
- `three-d-stage.js` — viewer kabuğu (ışık, kamera, orbit, GLB/OBJ dışa aktarma)
- `01-…03-*.html` — seçilen varyantları doğrudan açan preset'ler
