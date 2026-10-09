# Teknik Mimari

Son güncelleme: 7 Ekim 2026

## Depo yapısı

```
SportApps/
├── app/                  Expo uygulaması (React Native, TypeScript)
│   ├── assets/data/      Uygulamaya gömülen veritabanı ve sürüm dosyası
│   ├── assets/sounds/    Efekt sesleri
│   └── src/
│       ├── app/          Ekranlar (Expo Router): tanıtım, karşılama, giriş, kayıt, ana ekran, maç, arkadaş odası, hesap
│       ├── components/   Ortak arayüz bileşenleri
│       ├── constants/    Tema: renkler, boşluklar
│       ├── data/         Veritabanı sağlayıcısı ve sorgular
│       ├── feedback/     Dokunsal geri bildirim ve ses
│       ├── features/     Özellik kodları: maç (yerel ve online), hesap
│       ├── online/       Sunucuyla canlı bağlantı istemcisi
│       ├── hooks/        Tema kancaları
│       └── i18n/         Çok dilli altyapı ve çeviri dosyaları
├── server/               Sunucu (Node.js, Fastify, SQLite)
│   ├── src/accounts/     Hesaplar: şifre, oturum, kimlik doğrulama, veri erişimi
│   ├── src/http/         Uç noktalar, hata biçimi, istek sınırlama
│   ├── src/football/     Futbol veritabanına erişim (cevap doğrulama, ızgara seçimi)
│   ├── src/play/         Online maç: bağlantı, eşleştirme, maç odası, bot, maç kaydı
│   ├── tests/            Sunucu testleri
│   └── data/             Sunucu veritabanı (depoya girmez)
├── packages/
│   ├── protocol/         Uygulama ile sunucu arasındaki ortak tipler ve doğrulama kuralları
│   ├── game-core/        Uygulama ve sunucunun ortak kural motoru
│   └── football-data/    Uygulama ve sunucunun ortak kullandığı veritabanı sorguları
├── data/                 Veri hattı (Python)
│   ├── pipeline/         Veri hattının kodu
│   ├── portraits/        Görsel hattının kodu (yerel yapay zekâ)
│   ├── overrides/        Elle düzeltme tabloları
│   ├── tests/            Veri testleri
│   ├── build/            Üretilen veritabanı, rapor ve oyuncu görselleri (depoya girmez)
│   └── .cache/           İndirilen ham veri (depoya girmez)
└── docs/                 Belgeler
```

Depo npm çalışma alanı (workspaces) olarak kuruludur: kökteki `package.json`; `app`, `server` ve `packages/*` klasörlerini birbirine bağlar.

## Komutlar

| İş | Nerede | Komut |
|---|---|---|
| Bağımlılıkları kurmak | depo kökü | `npm install` |
| Uygulamayı çalıştırmak | `app` | `npx expo start` |
| Sunucuyu geliştirme kipinde çalıştırmak | `server` | `npm run dev` |
| Sunucuyu çalıştırmak | `server` | `npm start` |
| Sunucu testleri | `server` | `npm test` |
| Uygulama ve kural motoru testleri | depo kökü | `npm test` |
| Tip denetimi | depo kökü | `npm run typecheck` |
| Lint | `app` | `npx expo lint` |
| Android paketini denemek | `app` | `npx expo export --platform android` |
| Veriyi baştan üretmek | `data` | `python -m pipeline build` |
| Kaynakları yeniden indirerek üretmek | `data` | `python -m pipeline build --refresh` |
| Yalnızca ızgaraları yeniden üretmek | `data` | `python -m pipeline grids` |
| Yalnızca uygulama veritabanını yeniden üretmek | `data` | `python -m pipeline bundle` |
| Veri testleri | `data` | `python -m unittest discover -s tests -t .` |

Veri hattı Python 3.12 ile yazıldı ve dış paket gerektirmez. Uygulama Node 24 ve npm 11 ile kuruldu.

### Android emülatörü

Bilgisayarda `sportapps` adlı sanal cihaz kuruludur (Pixel 7, Android 16, Türkçe). Android SDK `%LOCALAPPDATA%\Android\Sdk` altındadır; Expo bu varsayılan yeri kendisi bulur, ayar gerekmez.

| İş | Komut |
|---|---|
| Emülatörü pencereli başlatmak | `%LOCALAPPDATA%\Android\Sdk\emulator\emulator.exe -avd sportapps` |
| Emülatörü penceresiz başlatmak | aynı komut, sonuna `-no-window -gpu swiftshader_indirect` |
| Uygulamayı emülatörde açmak | emülatör açıkken `app` klasöründe `npx expo start --android` (ya da çalışan Expo terminalinde `a`) |
| Ekran görüntüsü almak | `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe exec-out screencap -p > ekran.png` |
| Uygulama günlüklerini okumak | `adb logcat -s ReactNativeJS:V` |
| Uygulama verisini sıfırlamak (ilk açılışı denemek için) | `adb shell pm clear host.exp.exponent` |

SDK'ya paket eklemek için `sdkmanager` JDK 17 ister; `JAVA_HOME` yalnızca o komut için `%LOCALAPPDATA%\Android\jdk-17` yapılır. Sistemdeki Java sürümü değişmedi.

## Veri hattı

### Kaynaklar

| Kaynak | Ne alınır | Nasıl |
|---|---|---|
| transfermarkt-datasets | Oyuncular, kulüpler, transferler, maç kayıtları | Açık depolama adresinden sıkıştırılmış CSV |
| Wikidata | Futbolcular, takım kayıtları, uyruk, mevki, doğum tarihi, fotoğraf adı, adlar | QLever aynası üzerinden SPARQL |
| Wikipedia | Oyuncu maddelerinin okunma sayısı | MediaWiki Action API (son 60 gün, istek başına 50 başlık) ya da aylık okunma dökümü |

- Resmî Wikidata sorgu servisi kesinti sırasında dakikada bir isteğe düşüyor; bu yüzden QLever aynası kullanılır.
- Wikimedia, iletişim bilgisi içermeyen istemcileri kısıtlar. İsteklerde kimlik olarak depo adresi gönderilir; `PIPELINE_CONTACT` ortam değişkeniyle değiştirilebilir.
- İndirilen her şey `data/.cache/` altında saklanır. Okunma sayıları ay bazında önbelleğe alınır.

### Aşamalar

1. **Kapsam.** Transfermarkt setindeki kulüplerden altı ligde yer alanlar seçilir: Süper Lig, Premier League, La Liga, Serie A, Bundesliga, Ligue 1. Toplam 219 kulüp.
2. **Kulüp eşleştirme.** Wikidata'daki Transfermarkt takım kimliği (P7223) ile kulüpler bağlanır. Aynı kulübün birden fazla Wikidata kaydı varsa (çok branşlı kulüp kaydı gibi) en çok futbolcusu olan esas alınır, diğerleri ona bağlanır.
3. **Oyuncu eşleştirme.** Wikidata'daki Transfermarkt oyuncu kimliği (P2446) ile bağlanır. Kimliği olmayan oyuncularda doğum tarihi ve isim kullanılır.
4. **Kulüp kayıtlarını birleştirme.** İki kaynaktaki "şu oyuncu şu kulüpteydi" kayıtları tek satıra indirilir.
5. **Bilinirlik puanı.** Pazar bazında hesaplanır.
6. **Izgara üretimi.** Pazar ve zorluk seviyesi bazında.
7. **Çıktılar.** Tam veritabanı, kalite raporu ve uygulamaya gömülen küçültülmüş veritabanı.

### Veri kuralları

| Kural | Açıklama |
|---|---|
| "Oynadı" | Kadroda olması yeter; kiralık dönemler dahil her resmî kulüp kaydı sayılır |
| Uyruk | Yalnızca ana uyruk geçerlidir. Transfermarkt'ta varsa oradaki değer, yoksa Wikidata'daki millî takım ülkesi, o da yoksa tek vatandaşlık |
| Söylenti kayıtları | Yalnızca Wikidata'dan gelen ve içinde bulunulan yıl başlayan kayıtlar atılır |
| Doğrulanmış kayıt | Transfermarkt'ta görülen ya da Wikidata'da yılı olan kayıt doğrulanmış sayılır. Tarihsiz Wikidata kayıtları cevap olarak kabul edilir ama ızgara kurarken sayılmaz |
| Kadın oyuncular | Erkek takımına bağlanmış kadın futbolcular kapsam dışıdır |
| Tarihî ülkeler | Açık halefi olanlar bugünkü ülkeye bağlanır (Osmanlı İmparatorluğu → Türkiye). Sovyetler Birliği, Yugoslavya, Çekoslovakya ve Doğu Almanya ayrı ülke olarak durur |
| Oyuncu kimliği | Kalıcı kayıttan gelir (aşağıda). Yeni oyuncuda: Wikidata kaydı varsa onun numarası, yoksa 1.000.000.000 + Transfermarkt numarası |

### Kalıcı oyuncu kimlikleri

Oyuncu kimliği sunucudaki günlük bulmaca cevaplarında (`puzzle_answers`), görsel dosyalarının adında ve uygulamanın veritabanında kullanılır; bir kez verildikten sonra değişmemelidir. Kimlikler bu yüzden depoda tutulan `data/registry/player_ids.csv` dosyasına kaydedilir (8 Ekim 2026): her satır bir kimlik ile o oyuncunun Transfermarkt ve Wikidata kimliğidir.

Her veri üretiminde `pipeline/registry.py` oyuncuları kayıtla eşleştirir:

1. Wikidata kimliği kayıtta olan oyuncu o kimliği alır.
2. Kalanlardan Transfermarkt kimliği kayıtta olan, kimliği başkası almadıysa onu alır. Böylece yalnızca Transfermarkt'ta olan bir oyuncu sonradan Wikidata'ya bağlanınca kimliği değişmez (kayıttan önce 1.000.000.000'lu kimlikten Wikidata numarasına geçerdi).
3. Kayıtta olmayan oyuncu yeni kimlik alır: Wikidata numarası, yoksa 1.000.000.000 + Transfermarkt numarası. Bu kimlik kayıtta başka birine aitse 2.000.000.000'dan sonraki ilk boş numara verilir.

İki kayıt tek oyuncuda birleşirse Wikidata tarafının kimliği kalır, öbürü emekliye ayrılır; emekli kimlik kayıtta durur ve bir daha kimseye verilmez. Bir üretimde görünmeyen oyuncunun satırı da durur, geri dönerse aynı kimliği alır. Kayıt, `python -m pipeline build` veritabanını yazdıktan sonra güncellenir; dosya veriyle birlikte commit'lenmelidir (bir test, uygulama veritabanındaki her oyuncunun kayıtta olduğunu denetler).

### Elle düzeltme tabloları

`data/overrides/` altındaki dosyalar otomatik eşleştirmenin çözemediği yerleri düzeltir.

| Dosya | İşlevi |
|---|---|
| `leagues.csv` | Kapsamdaki ligler |
| `markets.csv` | Pazarlar: kod, dil, yerli lig, bilinirlikte kullanılan diller |
| `club_wikidata_ids.csv` | Transfermarkt kimliği Wikidata'da kayıtlı olmayan kulüpler |
| `club_wikidata_aliases.csv` | Bir kulübe bağlanacak ek Wikidata kayıtları |
| `countries.csv` | Zorla eklenen ülkeler ve bayrak kodları (İngiltere, İskoçya gibi) |
| `country_aliases.csv` | Bir ülkenin başka bir ülke kaydına bağlanması |
| `country_display_names.csv` | Ülke adlarının dil bazında düzeltmesi |
| `transfermarkt_countries.csv` | Transfermarkt'taki ülke yazımlarının karşılığı |

### Bilinirlik puanı

Puan 0 ile 100 arasındadır ve pazar bazında hesaplanır.

```
yerel     = sınırla((log10(okunma + 1) − 2,3) / 2,2)
erişim    = sınırla(ln(1 + dil sayısı) / ln(151))
değer     = sınırla((log10(en yüksek piyasa değeri) − 6) / 2,3)
millî     = sınırla(millî maç sayısı / 100)
dünya     = en büyük(erişim, değer, 0,8 × millî)
puan      = 100 × (0,65 × yerel + 0,35 × dünya)
```

- "Okunma", oyuncunun o pazarın dilindeki Vikipedi maddesinin son 60 günlük okunma sayısıdır.
- "Dil sayısı", oyuncunun kaç dilde Vikipedi maddesi olduğudur.
- "Sınırla", değeri 0 ile 1 arasına sıkıştırır.
- Puan güncel ilgiye duyarlıdır; veri hattı her çalıştığında yeniden hesaplanır.

Birden fazla dille ölçülen pazar (`int`): beş dilin okunma sayıları toplanamaz, çünkü İngilizce Vikipedi diğerlerinin birkaç katı okunur ve sonuç İngiliz ligine kayar. Bunun yerine:

1. Her dilde oyuncular okunmaya göre sıralanır; sıradaki oyuncuya, ilk pazarın (Türkiye) aynı sıradaki okunma sayısı verilir. Böylece her dil eşit ağırlık taşır.
2. Oyuncunun "yerel" değeri beş dildeki değerlerinin ortalamasıdır; maddesi olmayan dilde sıfır sayılır.
3. Puan yukarıdaki formülle yuvarlanmadan hesaplanır, oyuncular sıralanır ve puanlar ilk pazarın puan dağılımına oturtulur. İki pazarda da eşiği geçen oyuncu sayısı bu yüzden neredeyse aynıdır (50 ve üstü: 727 ve 731) ve ızgara seviyeleri iki pazarda da aynı eşiklerle çalışır.

- Türkiye pazarının puanları bu değişiklikten etkilenmedi (13.143 satırın hiçbiri değişmedi).
- Uluslararası pazarın en tanınmış 300 oyuncusunun 124'ü Türkiye pazarının ilk 300'ünde de var.
- Okunma sayıları beş dilde yaklaşık 171 bin madde ediyor; API ile dakikada 60 madde alınabildiği için aylık döküm kullanılır: `pageviews-YYYYMM-user.bz2` (6 GB, `dumps.wikimedia.org/other/pageview_complete/monthly/`) `data/.cache/wikipedia/` altına indirilir ve `python -m pipeline build --views-month YYYY-MM` ile okutulur (yaklaşık 9 dakika). Önbellek ay bazında olduğu için her ayın ilk çalıştırmasında bu adım gerekir; atlanırsa hat yavaş API'ye düşer.

### Izgara üretimi

| Seviye | En düşük puan | Yerli kulüp | Yabancı kulüp | Ülke | Hedef |
|---|---|---|---|---|---|
| 1 (kolay) | 50 | 4 | 20 | 10 | 1.500 |
| 2 (orta) | 42 | 12 | 45 | 14 | 1.500 |
| 3 (zor) | 32 | 30 | 130 | 30 | 1.500 |

1. Her seviye için puan eşiğini geçen oyuncular alınır ve başlık havuzu kurulur. Kulüpler ve ülkeler, eşiği geçen oyuncu sayısına göre sıralanır.
2. İki başlık arasında en az üç ortak tanınmış oyuncu varsa "uyumlu" sayılır. İki ülke hiçbir zaman uyumlu değildir.
3. Satırlar kulüplerden seçilir; denemelerin %60'ında ilk satır yerli bir kulüptür. Her yeni satır, kalan sütun adayları en az üç olacak şekilde seçilir.
4. Sütunlar, üç satırla da uyumlu başlıklardan seçilir. Izgarada 0, 1 ya da 2 ülke başlığı olur (ağırlıklar %50, %35, %15) ve ülkeler hep aynı eksende durur.
5. Dokuz hücreye dokuz farklı oyuncu yerleştirilebildiği denetlenir.
6. Bir başlık, seviyedeki ızgaraların en çok %30'unda yer alır. Az kullanılan başlıklar seçimde öne geçer.
7. Aynı altı başlık iki farklı seviyede tekrar etmez. Üretim sabit bir tohum değeriyle yapılır.

Yerli ligi olmayan pazarda (`int`) yerli kulüplere ayrılan yerler diğer kulüplere verilir: havuz 24, 57 ve 160 kulüpten oluşur ve ilk satır kuralı uygulanmaz. İlk denemede bu yapılmadığı için kolay seviyede yalnızca 96 ızgara çıkmıştı; 20 kulüplük havuzda başlık başına %30 sınırı üretimi kilitliyordu.

### Tam veritabanı

Konum: `data/build/football.sqlite`. Yaklaşık 23 MB, 72.435 oyuncu.

| Tablo | İçerik |
|---|---|
| `meta` | Üretim zamanı |
| `countries`, `country_names` | Ülkeler ve dil bazında adları |
| `leagues` | Ligler |
| `markets` | Pazarlar: kod, dil, yerli lig |
| `clubs`, `club_names` | Kulüpler ve dil bazında adları |
| `players` | Oyuncu: ad, doğum tarihi, mevki, dil sayısı, piyasa değeri, millî maç, fotoğraf adı, kaynak kimlikleri |
| `player_names` | Aramada kullanılan tüm ad biçimleri ve sadeleştirilmiş hâlleri |
| `player_fame` | Pazar bazında bilinirlik puanı ve okunma sayısı |
| `player_countries` | Oyuncu uyrukları; ana uyruk işaretli |
| `player_clubs` | Oyuncu-kulüp kayıtları: ilk yıl, son yıl, maç sayısı, kaynak, doğrulanmış mı |
| `grid_levels` | Seviye eşikleri |
| `grids`, `grid_headers` | Izgaralar ve başlıkları |

### Uygulama veritabanı

Konum: `app/assets/data/football.db`. Yaklaşık 13 MB. Yanındaki `version.json` şema ve veri sürümünü taşır.

Tam veritabanından farkları:

- Kaynak kimlikleri, piyasa değeri, maç sayısı gibi uygulamanın kullanmadığı sütunlar yoktur.
- Oyuncunun ana uyruğu doğrudan `players.country_id` sütunundadır.
- Bilinirlik puanı 20'nin altındaki oyuncular için satır tutulmaz; bu oyuncular yine geçerli cevaptır.
- Ad araması için `player_search` adında tam metin dizini (FTS5) vardır.
- Oyun modları için: `player_stats` (kariyer toplamları), `player_club_stats` (kulüp bazında), `player_profile` (en yüksek piyasa değeri, millî maç), `player_club_years` (kulübe katılış ve ayrılış yılı). Bu tabloları sunucu okur; uygulama yalnızca `player_stats` ve `player_clubs` üzerinden arama süzgeci kurar. Bu tablolar eklenirken veri sürümü değiştirilmedi, çünkü uygulamanın kullandığı veride değişiklik yok.

## Görsel hattı

Konum: `data/portraits`. Oyuncu fotoğraflarını çizim tarzında, arka planı saydam kart görsellerine çevirir. Veri hattından ayrıdır: ekran kartı ve dış paketler ister, bu yüzden kendi Python ortamında çalışır.

### Kurulum ve komutlar

| İş | Komut (`data` klasöründe) |
|---|---|
| Ortamı kurmak | `python -m venv .venv-imaging`, ardından `.venv-imaging\Scripts\pip install torch torchvision --index-url https://download.pytorch.org/whl/cu128` ve `.venv-imaging\Scripts\pip install -r portraits/requirements.txt` |
| Hattın tamamı | `.venv-imaging\Scripts\python -m portraits all` |
| Tek aşama | `fetch`, `crop`, `enlarge`, `stylize`, `export` (örnek: `python -m portraits stylize --limit 50`) |
| Karşılaştırma sayfası üretmek | `.venv-imaging\Scripts\python -m portraits.pilot 8 0` |

Her aşama kaldığı yerden devam eder; yarıda kesilen çalıştırma yeniden başlatılabilir. `fetch` ve `export` dış paket istemez, sistem Python'u ile de çalışır.

### Aşamalar

| Aşama | Dosya | Yaptığı |
|---|---|---|
| `fetch` | `sources.py` | Hedef oyuncuların Commons fotoğrafı için yazar ve lisans bilgisini çeker, serbest lisanslı olanların 1280 piksellik kopyasını indirir |
| `crop` | `faces.py` | Yüzü bulur, baş ve omuzları içine alan kare kırpar. Uygun olmayan fotoğrafı nedeniyle birlikte işaretler |
| `enlarge` | `faces.py` | Yüzü küçük kalan fotoğrafların yüksek çözünürlüklü kopyasını indirip yeniden dener |
| `alternatives` | `alternatives.py` | Bilinirliği 30 ve üstü olup portresi çıkmayan oyuncular için Commons'taki diğer serbest lisanslı fotoğrafları dener; tutanı `data/overrides/portrait_files.csv` dosyasına yazar |
| `stylize` | `stylize.py`, `matting.py` | Arka planı ve forma üzerindeki logoları temizler, kırpımı çizime çevirir, sonucu arka plandan ayırır |
| `review` | `review.py` | Biten çizimleri ölçer; yüzü bulunamayan, birden fazla kişi içeren, kesimi bozuk ya da bulanık olanları `data/build/portraits-rejected` klasörüne ayırır. `data/overrides/portrait_rejections.csv` içindeki fotoğrafları da reddeder |
| `export` | `publish.py` | Üretilen görsellerin yazar ve lisans kaydını iki veritabanına yazar, veri sürümünü yeniler |

Hedef: Türkiye pazarında bilinirlik puanı 20 ve üzeri olan oyuncular (8 Ekim 2026'da 32'den düşürüldü; 13.165 oyuncu, 10.783'ünün Commons fotoğrafı var).

Toplu üretimin sonucu (9 Ekim 2026): 7,034 portre. Hedefteki 13.165 oyuncunun 10.783'ünün Commons fotoğrafı var, 10.666'sı serbest lisanslı; kırpma aşamasından 8.079'u geçti, yeterli çözünürlükte olan 7.271'i çizildi, gözden geçirme 559 çizimi ayırdı, alternatif fotoğraf araması 303 oyuncuya yeni kaynak buldu. En tanınmış oyuncularda kapsama: ilk 50'de 48, ilk 100'de 89, ilk 500'de 437, ilk 1.000'de 831.

- **Gözden geçirme ölçütleri.** Çizimde tam bir yüz bulunmalı (güven 0,6 ve üstü), başa bağlı tek parça olmalı, görünen alan tuvalin %25-62'si arasında kalmalı, yüz bölgesinin keskinliği 33'ün altına düşmemeli. Eşik, keskinlik sırasına dizilmiş örnek sayfalara bakılarak seçildi: 33'ün altı belirgin bulanık, üstü kart boyutunda kabul edilebilir.
- **Alternatif fotoğraf.** Oyuncunun Commons kategorisindeki dosyalardan (yalnızca adında oyuncunun soyadı geçenler) ve "bu kişiyi gösterir" diye işaretlenmiş dosyalardan en çok altı aday denenir; dikey ve büyük olanlar önce. Aday yüz ve çözünürlük denetimini geçerse oyuncunun kaynağı olur. Çizimi sonradan reddedilirse sonraki çalıştırmada sıradaki aday denenir (denenenler `data/.cache/portraits/alternatives-tried.json` içinde).
- **Elle düzeltme.** `portrait_files.csv` (Wikidata kimliği, dosya) bir oyuncunun kaynağını değiştirir; `portrait_rejections.csv` (dosya, oyuncu) kötü bir fotoğrafı kalıcı olarak dışarıda bırakır. İkisi de depoda tutulur.
- **Sıra.** `fetch`, `crop`, `enlarge`, `stylize`, `review`, `alternatives`, sonra yeniden `stylize` ve `review`; `export` en sonda ve uygulama derlemesiyle birlikte.

### Kurallar

- **Lisans.** Yalnızca değiştirilmiş kopyaya izin veren lisanslar kabul edilir: CC0, kamu malı, CC BY, CC BY-SA. Ticari kullanımı ya da türev işi yasaklayan (NC, ND) lisanslar ve lisansı okunamayan dosyalar elenir.
- **Yüz.** YuNet ile bulunur. Büyük yüzlerde algılayıcı güvenini yitirdiği için görüntü üç ölçekte taranır. Yüzü 64 pikselden dar olan, tam profilden duran, başı kadrajdan taşan ya da kadrajda benzer büyüklükte ikinci bir yüz bulunan fotoğraf kullanılmaz.
- **Kırpma.** Karenin kenarı yüzün 2,5 katıdır. Fotoğraf dar ise 1,5 kata kadar küçülür (yalnızca baş kullanıldığı için 1,9'dan indirildi) ve kare fotoğrafın içine kaydırılır; yine de sığmayan kısım düz koyu renkle doldurulur.
- **Çözünürlük.** Kırpım kaynağı 300 pikselden küçükse görsel üretilmez; düşük çözünürlüklü kaynakta benzerlik kayboluyor.
- **Ön temizlik.** Çizimden önce arka plan düz koyu renge, çene çizgisinin altındaki giysi tek renge çevrilir. Böylece sponsor panoları, kulüp armaları ve forma yazıları çizime geçmez.
- **Bulanıklık.** Yüz bölgesinin keskinliği (160 piksele indirilmiş yüzde Laplace varyansı) 20'nin altındaysa fotoğraf kullanılmaz; önce yüksek çözünürlüklü kopyası denenir.
- **Çizim.** SDXL, görüntüden görüntüye kipte çalışır (güç 0,32; 24 adım): fotoğrafa yakın, yumuşak boyama. İlk tarz (çizgi roman, güç 0,66) yüzü fazla değiştiriyordu. ControlNet yalnızca baş bölgesindeki kenar çizgileriyle beslenir (ağırlık 0,9).
- **Baş kesimi.** Çizimden yalnızca baş alınır: göz hizasının üstünde saç için geniş, ağız ve çeneye doğru daralan bir sınır uygulanır, çenenin altında kısa bir boyun kalır, başa bağlı olmayan parçalar (el, başka kişi) atılır. Baş, tuvalin %90'ını dolduracak şekilde ortalanır.
- **Çıktı.** 512×512, saydam arka planlı WebP; ortalama 18 KB (1.232 görsel 26 MB). `data/build/portraits/<oyuncu kimliği>.webp` olarak yazılır ve depoya girmez.

### Modeller

| Model | Görevi | Lisans |
|---|---|---|
| Stable Diffusion XL base 1.0 | Çizim | CreativeML Open RAIL++-M (ticari kullanıma izin verir) |
| ControlNet Canny SDXL 1.0 | Yüz hatlarını koruma | Open RAIL++ |
| SDXL VAE fp16 fix | Yarım duyarlıklı kod çözücü | MIT |
| BiRefNet | Arka plan ayırma | MIT |
| YuNet | Yüz bulma | MIT |

Yüz tanıma ya da kimlik eşleme modeli kullanılmaz. Modeller yaklaşık 10 GB yer tutar ve `data/.cache/portraits/models` ile Hugging Face önbelleğine iner.

### Uygulamaya ulaşması

- Görsellerin listesi, yazar ve lisansla birlikte veritabanındaki `player_portraits` tablosundadır. `export` bu tabloyu uygulama veritabanında yerinde günceller ve `version.json` içindeki veri sürümünü yeniler; sürüm değişince uygulama yeni veritabanını açar.
- Görsel dosyalarını sunucu verir: `GET /v1/portraits/<kimlik>.webp`. Klasör `PORTRAITS_PATH` ile ayarlanır (varsayılan `data/build/portraits`). Cevap bir hafta önbelleklenir; adres veri sürümünü taşıdığı için yeni üretimde önbellek kendiliğinden yenilenir.
- Kart, veritabanında görseli kayıtlı oyuncu için görseli yükler ve cihazda saklar. Görseli olmayan ya da sunucuya ulaşılamayan durumda kart eski hâliyle görünür.
- "Görsel kaynakları" ekranı (hesap ekranından açılır) her görselin oyuncusunu, yazarını ve lisansını listeler; satıra dokununca kaynak fotoğraf açılır. Çizimler kaynak fotoğrafla aynı lisansla paylaşılır.

## Diller ve pazarlar

Dil ve pazar ayrı boyutlardır: dil arayüz metnini, pazar oyuncuların bilinirliğini ve ızgaraları belirler.

| Dil | Pazar | Not |
|---|---|---|
| Türkçe | `tr` | Yerli lig Süper Lig; bilinirlik Türkçe Vikipedi'den |
| İngilizce, Almanca, İspanyolca, Fransızca, İtalyanca | `int` | Yerli lig yok; bilinirlik beş dilin Vikipedi'sinden |

- Uygulama cihaz dilini alır; desteklenmeyen dilde İngilizce açılır. Pazar, dili eşleşen pazardır; yoksa `int` (`resolveMarket`).
- Eşleştirme, günün bulmacası ve bot kadrosu pazar bazındadır: bir Alman ile bir İspanyol birbirine denk gelir, Türkçe kullanan oyuncu yalnızca Türkiye pazarındaki oyuncularla eşleşir. Lider tablosu ise ortaktır; bütün oyuncular aynı tabloda yer alır.
- Bot kadrosu pazar başına 48 bottur. İki pazar da kullanılmaya başlayınca ortak tabloda en çok 96 bot olabilir; kullanıcı pazar başına 48'in kalmasına karar verdi (9 Ekim 2026).
- Oyuncu adları çevrilmez. Kulüp ve ülke adları altı dilde saklanır. Yeni dört dilde kulüp adı, Wikidata etiketi İngilizcesinden dört karakterden fazla uzunsa İngilizcesiyle değiştirilir (`compact_names`); Wikidata bu dillerde çoğu kulübün resmî uzun adını tutuyor ("Fußball-Club Bayern München").

Çevirilerin yeri:

| Parça | Dosya |
|---|---|
| Uygulama arayüzü | `app/src/i18n/locales/<dil>.json`; diller `app/src/i18n/languages.ts` içinde kayıtlı |
| Şifre sıfırlama postası | `server/src/mail/messages.json` |
| Bildirimler | `server/src/notifications/messages.json` |
| Site ve yasal sayfalar | `deploy/site/<dil>.html`, `deploy/site/<dil>/{privacy,terms,delete-account}.html`; Türkçesi kökte |
| Mağaza metinleri | `docs/magaza-metinleri.md` |

- Yeni dil eklemek: yukarıdaki dosyalara dili eklemek, `data/pipeline/config.py` içindeki `LANGUAGES` listesine ve gerekirse `markets.csv` içindeki `fame_languages` sütununa yazmak, `deploy/localize.py` içindeki dil tablosuna eklemek.
- `python deploy/localize.py` sitedeki her sayfaya dil menüsünü, `hreflang` bağlantılarını, kalıcı adresi ve paylaşım adresini yazar; var olan sayfalara göre çalışır, yeniden çalıştırılabilir.
- Kart üstündeki mevki kısaltmaları: Almanca TW/AB/MF/ST, İspanyolca PT/DF/MC/DL, Fransızca G/D/M/A, İtalyanca POR/DIF/CEN/ATT.
- Emülatörde başka dili denemek: `adb shell cmd locale set-app-locales host.exp.exponent --locales de-DE`, uygulamayı kapatıp açmak; geri almak için aynı komut boş `--locales ""` ile.
- Almanca, İspanyolca, Fransızca ve İtalyanca metinler makine çevirisidir; anahtar, yer tutucu ve mağaza sınırları denetlendi ama ana dili konuşan biri okumadı. Yasal sayfaların çevirisi bilgi amaçlıdır; her birinin başında Türkçe metnin geçerli olduğu yazar.

## Kural motoru

Konum: `packages/game-core`. Saf TypeScript; ağ, veritabanı ya da arayüz bilmez. Aynı kod hem uygulamada hem sunucuda çalışacak.

| Parça | İşlevi |
|---|---|
| `createMatch` | Boş bir maç başlatır |
| `submitAnswer` | Bir cevabı işler: hücre alındı, yanlış ya da zaten kullanılmış |
| `skipTurn` | Sırayı boş geçirir (süre doldu, bot cevap veremedi) |
| `forfeit` | Bir tarafın çekilmesiyle maçı bitirir |
| `completesLine`, `lineStillPossible`, `countCells`, `emptyCells`, `usedFootballerIds`, `headersAt` | Yardımcılar |
| `chooseBotMove` | Botun hamlesini seçer |
| `normalizeName`, `nameTokens` | Adları aramaya uygun sade biçime çevirir |

Maç kuralları:

- Hamle süresi 20 saniye.
- Yanlış cevap, kullanılmış futbolcu ya da süre dolması sırayı rakibe geçirir.
- Aynı hizada üç hücreyi alan kazanır.
- Izgara dolar ve üçlü olmazsa daha çok hücre alan kazanır (dokuz hücre olduğu için eşitlik çıkmaz).
- Art arda dört turda hücre alınamazsa oyun biter ve hücre sayısına bakılır.
- **Beraberlik yoktur (9 Ekim 2026, kullanıcının kararı).** Maç art arda paslarla bittiğinde hücreler eşitse maç boyunca daha az hata yapan kazanır (yanlış cevap, kullanılmış futbolcu, pas ve süre aşımı sayılır; `misses`). O da eşitse maça ikinci başlayan kazanır (ilk hamle avantajının karşılığı). Bitiş nedenleri: `line`, `cells`, `misses`, `second`, `forfeit`.
- **Diğer oyunlarda eşitlik: hızlı olan kazanır (9 Ekim 2026, kullanıcının kararı).** Zincir ve Açık Artırma'da puanlar eşit bitemez. Kart Düellosu, Kadro Kur, Hangisi Yüksek, İlk 10 ve Kariyer Yolu'nda eşit bitebilir; bu durumda maç boyunca toplam düşünme süresi kısa olan kazanır, bitiş nedeni `speed` olur. Süreyi sunucu ölçer (`server/src/play/thinking.ts`): oyuncuya sıra ya da tur açıldığı andan cevabına kadar geçen süre toplanır; süre aşımı tam süre sayılır, botun bekleme süresi de aynı biçimde ölçülür. Kart Düellosu'nda kart seçme aşaması da sayılır. Süreler de tam eşitse (pratikte yalnızca iki taraf da hiç oynamadığında) sıra tabanlı oyunlarda maça ikinci başlayan, eşzamanlı oyunlarda O tarafı kazanır. Bu oyunlarda sonucu sunucu belirleyip gönderdiği için kural eski uygulama sürümüyle de çalışır; eski sürüm yalnızca açıklamayı "puan üstünlüğü" diye gösterir. Duraklatılmış Nadir Cevap oyununa dokunulmadı.
- **Üçlü imkânsızlaşınca maç sürer.** Sekiz hizanın hepsinde iki tarafın da hücresi varsa (`lineStillPossible` yanlış döner) artık kimse üçlü yapamaz; uygulama tahtanın altında "Üçlü artık mümkün değil. En çok kareyi alan kazanır." uyarısını gösterir ve oyun kalan hücreler için devam eder.
- Uygulama maçı sunucunun gönderdiği hamleleri aynı motorla yeniden oynatarak kurar. Eski sürümdeki motor eşit hücreli pas bitişini hâlâ beraberlik sayar; sunucu ise kazananı kaydeder. Bu fark yalnızca o seyrek durumda ve yalnızca eski sürümde görülür.

Bot:

- Önce kazandıran hücreyi, sonra rakibi engelleyen hücreyi, sonra ortayı seçer.
- Cevabı, o hücre için en tanınmış birkaç oyuncu arasından rastgele seçer.
- Seviyeye göre cevap verme olasılığı %55, %75 ve %92'dir.

Ad sadeleştirme hem Python'da hem TypeScript'te vardır. İkisinin aynı sonucu verdiği, 214 adlık ortak bir test dosyasıyla denetlenir (`packages/game-core/tests/fixtures/normalized-names.json`).

## Uygulama

Expo SDK 57, React Native 0.86, React 19, TypeScript 6, Expo Router.

| Konum | İçerik |
|---|---|
| `src/app/_layout.tsx` | Kök yerleşim: çeviri altyapısı, tema, veritabanı sağlayıcısı |
| `src/app/index.tsx` | Ana ekran: oyun ve zorluk seçimi; online, arkadaş odası ve bota karşı girişleri |
| `src/app/match.tsx` | Maç ekranı: skor, ızgara, süre, sonuç |
| `src/features/match/session.ts` | Maç oturumu: kural motorunu geri bildirim ve süreyle sarar |
| `src/features/match/use-match.ts` | Izgarayı yükler, süreyi işletir, bot hamlelerini oynatır |
| `src/features/match/board.tsx` | Izgara bileşeni |
| `src/features/match/scoreboard.tsx` | İki tarafın skor paneli |
| `src/features/match/turn-timer.tsx` | Skia ile çizilen sayaç halkası |
| `src/features/match/win-burst.tsx` | Kazanma anındaki parçacık patlaması |
| `src/features/match/use-match-effects.ts` | Maç olaylarını ses ve titreşime bağlar |
| `src/components/stadium-background.tsx` | Skia ile çizilen stadyum zemini |
| `src/feedback/` | Dokunsal geri bildirim ve ses çalma |
| `src/features/match/footballer-search.tsx` | Futbolcu arama penceresi |
| `src/data/queries.ts` | Veritabanı sorguları: pazar, ızgara, arama, cevap doğrulama, bot seçenekleri |
| `src/data/database-provider.tsx` | Gömülü veritabanını açar |
| `src/i18n/` | Dil seçimi ve çeviri dosyaları |

- **Veritabanı.** Gömülü dosya ilk açılışta cihaza kopyalanır. Dosya adı veri sürümünü taşır; yeni veri sürümü yeni bir kopya demektir. Eski kopyaların silinmesi henüz yazılmadı.
- **Dil.** Cihaz dili desteklenenler arasındaysa o, değilse İngilizce kullanılır. Şu an Türkçe ve İngilizce var. Kulüp ve ülke adları veritabanından aynı dilde gelir.
- **Pazar.** Uygulama dilinin pazarı varsa o, yoksa ilk pazar kullanılır. Şu an yalnızca Türkiye pazarı var.
- **Arama.** En az iki harf yazılınca çalışır, bilinirliğe göre sıralar. Izgarada kullanılmış futbolcular listede gösterilmez.
- **Görünüm.** Tek tema: gece stadyumu. Kurallar [tasarim-dili.md](tasarim-dili.md) içinde.
- **Arayüz paketleri.** React Native Skia (çizim), Reanimated (animasyon), expo-haptics (titreşim), expo-audio (ses), Barlow yazı tipleri.
- **Animasyon değerleri.** Reanimated değerleri `.get()` ve `.set()` ile okunur ve yazılır; React Compiler doğrudan `.value` atamasını hata sayar.
- **Eğik yazı payı.** Android, eğik başlık yazı tipini (`Fonts.display`) içeriğe göre genişleyen kutularda dar ölçüp son kelimeyi görünmeyen ikinci satıra atar. `ThemedText`, Android'de bu yazı tipindeki boşluklu metnin sonuna bir boşluk ekler; satır sonundaki boşluk taşabildiği için pay kalır.
- **Taraf sırası.** Skor tablosu, düello masası, kadrolar, cevap sütunları ve can noktaları oyuncunun tarafını solda gösterir (`ownSideFirst`); sonuç skoru oyuncunun skoruyla başlar (`ownScoreFirst`).

## Sunucu

Konum: `server`. Node.js 24, Fastify, SQLite (Node'un kendi `node:sqlite` modülü). TypeScript dosyaları `tsx` ile doğrudan çalışır; derleme adımı yoktur.

### Ayarlar

Ortam değişkenleriyle verilir; hepsinin varsayılanı vardır.

| Değişken | Varsayılan | Anlamı |
|---|---|---|
| `HOST` | `0.0.0.0` | Dinlenen adres. Varsayılan, aynı ağdaki telefonun bağlanmasına izin verir |
| `PORT` | `4000` | Kapı |
| `DATABASE_PATH` | `server/data/sportapps.sqlite` | Sunucu veritabanı dosyası |
| `FOOTBALL_DATABASE_PATH` | `app/assets/data/football.db` | Cevapların doğrulandığı futbol veritabanı. Dosya yoksa sunucu açılır ama online maç kapalı kalır |
| `PORTRAITS_PATH` | `data/build/portraits` | Oyuncu görsellerinin durduğu klasör |
| `SESSION_DAYS` | `90` | Oturum ömrü |
| `GOOGLE_CLIENT_IDS` | boş | Kabul edilen Google istemci kimlikleri, virgülle ayrılır |
| `APPLE_CLIENT_IDS` | boş | Kabul edilen Apple uygulama kimlikleri, virgülle ayrılır |
| `APPLE_IAP_KEY_PATH`, `APPLE_IAP_KEY_ID`, `APPLE_IAP_ISSUER_ID`, `APPLE_BUNDLE_ID` | boş | App Store satın almalarını doğrulayan anahtar dosyası, anahtar kimliği, yayıncı kimliği ve uygulama kimliği. Dördü de verilmemişse iOS satın alması kapalıdır |
| `GOOGLE_PLAY_KEY_PATH`, `ANDROID_PACKAGE` | boş | Google Play satın almalarını doğrulayan servis hesabı anahtarı (JSON) ve paket adı. İkisi de verilmemişse Android satın alması kapalıdır |
| `ADMOB_AD_UNITS` | boş | Ödül yazdırabilen AdMob reklam birimleri, virgülle ayrılır (tam kimlik ya da `/` sonrasındaki sayı). Boşsa reklam ödülü kapalıdır |
| `RESEND_API_KEY_PATH`, `MAIL_FROM` | boş | E-posta servisinin anahtar dosyası ve gönderen adres. İkisi de verilmemişse şifre sıfırlama kapalıdır |
| `APPLE_SIGN_IN_KEY_PATH`, `APPLE_SIGN_IN_KEY_ID`, `APPLE_TEAM_ID` | boş | Apple ile giriş anahtarının dosyası, anahtar kimliği ve takım kimliği. `APPLE_BUNDLE_ID` ile birlikte dördü de verilmişse hesap silinirken Apple jetonu iptal edilir |
| `ADMIN_KEY_PATH` | boş | Yönetim panelinin anahtar dosyası. Verilmemişse panel ve istatistik ucu yoktur |

Google ya da Apple kimliği verilmemişse o giriş yöntemi kapalıdır ve "kullanılamıyor" cevabı döner.

### Uç noktalar

Hepsi `/v1` altındadır ve JSON konuşur. Oturum, `Authorization: Bearer <jeton>` başlığıyla taşınır.

| Yöntem ve yol | İşlevi |
|---|---|
| `GET /health` | Sunucu ayakta mı |
| `GET /version` | Sunucunun beklediği protokol ve veri sürümü; uygulama açılışta kendi sürümüyle karşılaştırır |
| `POST /auth/guest` | Misafir hesap ve oturum açar |
| `POST /auth/register` | E-posta, şifre ve kullanıcı adıyla yeni hesap açar |
| `POST /auth/login` | E-posta ve şifreyle giriş |
| `POST /auth/google`, `POST /auth/apple` | Sağlayıcının verdiği kimlik jetonuyla giriş |
| `POST /auth/logout` | Oturumu kapatır |
| `GET /me` | Oturumdaki hesabı döndürür |
| `POST /account/username` | Google ya da Apple ile açılan yeni hesabın kullanıcı adını bir kez belirler; sonra kilitlenir |
| `DELETE /account` | Hesabı ve ona ait her şeyi kalıcı siler; süren maçı hükmen bitirir, bağlantıyı kapatır |
| `POST /push-token`, `DELETE /push-token` | Cihazın bildirim anahtarını oyuncuya kaydeder ya da siler |
| `GET /matches` | Oyuncunun maçları; `game`, `before` (bitiş zamanı) ve `limit` ile süzülür, sayfalanır. Cevapta `more` daha eski maç olup olmadığını söyler |
| `GET /progress` | Toplam puan, seviye, gol, günlük seri, genel sonuçlar ve oyun oyun puan |
| `POST /daily` | Günün ödülünü verir; gün içinde ikinci istekte ödül boş döner |
| `GET /wallet` | Gol bakiyesi ve son 50 gol hareketi |
| `POST /auth/password/forgot` | Şifre sıfırlama kodu ister: e-posta ve dil. Her durumda 204 |
| `POST /auth/password/reset` | Kod ve yeni şifreyle şifreyi değiştirir; yeni oturum döner |
| `GET /matches/<kimlik>/protection` | O maçta reklamla geri alınan puan (yoksa 0) |
| `GET /admin/stats` | Yönetim panelinin sayıları; oturum değil yönetim anahtarı ister |
| `GET /ads` | Bakiye, bugün kalan reklam hakkı ve reklam başına ödül |
| `GET /ads/reward` | AdMob'un imzalı ödül bildirimi; oturum istemez |
| `POST /purchases` | Gol paketi satın alması: mağaza (`ios` ya da `android`), ürün kimliği ve kanıt. Cevapta yazılan gol ve yeni bakiye |
| `GET /leaderboard` | Lider tablosu: `period` (`week` ya da `all`), isteğe bağlı `game`. İlk 50, oyuncunun kendi satırı, haftalıkta sıfırlanma zamanı |
| `GET /puzzle` | Günün bulmacası (`market` ile): ızgara, kalan hak, hücreler ve oranları, puan, ödül, oynayan sayısı |
| `POST /puzzle/guess` | Bulmacada tahmin: pazar, hücre, futbolcu. Cevapta yeni durum, sonuç (doğru, yanlış, zaten kullanıldı) ve ödül verildiyse gol bakiyesi |
| `GET /puzzle/ranking` | Günün bulmaca sıralaması: ilk 50 ve oyuncunun kendi satırı |
| `GET /portraits/<kimlik>.webp` | Oyuncu görseli |
| `GET /play` (WebSocket) | Online maçın canlı bağlantısı |

Giriş ve kayıt uçları, geçerli bir oturumla gelen isteği "zaten giriş yapılmış" hatasıyla reddeder; önce çıkış yapılmalıdır. Kullanıcı adı değiştirilemez; tek istisna, Google ya da Apple ile açılan hesabın ilk girişteki bir kerelik seçimidir (hesap geçici `player######` adıyla ve `username_pending` işaretiyle açılır, uygulama ad seçilmeden içeri almaz).

Hata cevabı hep aynı biçimdedir: `{ "error": { "code": "..." } }`. Kodların tam listesi `packages/protocol` içindedir; uygulama her kodu kendi dilindeki mesaja çevirir.

### Sunucu veritabanı

| Tablo | İçerik |
|---|---|
| `users` | Kimlik, kullanıcı adı, benzersizlik anahtarı, misafir mi |
| `credentials` | E-posta ve şifre özeti |
| `identities` | Google ve Apple kimlikleri; Apple için hesap silinirken iptal edilecek yenileme jetonu |
| `sessions` | Oturum jetonunun özeti, son kullanım ve bitiş zamanı |
| `matches` | Biten online maçlar: tür (sıra, bot, oda), taraflar, kullanıcı adları, kazanan, bitiş nedeni, hücre sayıları, hamle sayısı, süre, iki tarafın puan değişimi, bot seviyesi (insan rakipte boş) |
| `ratings` | Oyuncu ve oyun başına görünen puan, en yüksek puan, gizli güç puanı (`rating`, varsayılan 1000), puanlı maç sayısı |
| `daily_rewards` | Günlük ödül serisi, en uzun seri, son ödül günü |
| `wallets` | Gol bakiyesi (eksiye düşemez) |
| `puzzle_plays` | Oyuncunun o günkü bulmacası: pazar, ızgara, kalan hak, bitiş zamanı, verilen gol. İlk tahminde oluşur |
| `puzzle_answers` | Bulmacada doğru cevaplar: gün, pazar, hücre, futbolcu. Oranlar ve puanlar bu tablodan sayılır |
| `goal_ledger` | Her gol hareketi: miktar, sonraki bakiye, neden (`welcome`, `daily`, `win`, `purchase`, `ad`), dayanak (maç kimliği, gün ya da makbuz). Aynı oyuncu, neden ve dayanak ikinci kez yazılamaz |
| `purchases` | İşlenen satın almalar: mağaza, işlem kimliği (ikisi birlikte benzersiz), oyuncu, ürün, gol, zaman |
| `point_protections` | Reklamla geri alınan maç puanları: maç, oyuncu, oyun, puan, zaman |
| `bots` | Bot kadrosu: hangi kullanıcı satırlarının bot olduğu, pazarı ve oluşturulma zamanı |
| `password_resets` | Oyuncu başına son sıfırlama kodunun özeti, yanlış deneme sayısı, 24 saatlik istek sayısı ve bitiş zamanı |
| `ad_rewards` | Ödül yazılan reklamlar: AdMob işlem kimliği (benzersiz), oyuncu, gün, zaman |
| `schema_migrations` | Uygulanmış şema sürümleri |

Şema değişiklikleri `server/src/database.ts` içindeki sıralı listeye eklenir; sunucu açılırken eksik olanları uygular.

### Yayına alma

Depo kökündeki `Dockerfile`, sunucuyu yalnızca üretim bağımlılıklarıyla paketler. İmaj; sunucu kodunu, ortak paketleri ve futbol veritabanını içerir. Kalıcı veriler (`/data`) imajın dışında tutulur.

| İş | Komut (depo kökünde) |
|---|---|
| İmajı üretmek | `docker build -t sportapps-server .` |
| Çalıştırmak | `docker run -d -p 4000:4000 -v sportapps-data:/data sportapps-server` |
| Docker olmadan | `npm ci --omit=dev --workspace @sportapps/server`, ardından `server` klasöründe `node --import tsx src/main.ts` |

- `/data` altında sunucu veritabanı (`sportapps.sqlite`) ve oyuncu görselleri (`portraits/`) durur. Görseller üretildiği bilgisayardan bu klasöre kopyalanmalıdır.
- Sunucu şifresiz HTTP konuşur. Önünde TLS sonlandıran bir katman gerekir (barındırma servisinin kendi katmanı, Caddy ya da Cloudflare Tunnel). WebSocket bağlantısı aynı adresten geçer.
- Uygulama yayın sürümünde sunucu adresini `EXPO_PUBLIC_API_URL` değişkeninden alır (örnek: `https://api.ornek.com`).
- Maçlar bellekte tutulduğu için tek kopya çalıştırılmalıdır; sunucu yeniden başlarsa süren maçlar düşer.
- Veri sürümü imajın içindeki `version.json` ile belirlenir; uygulamadaki veritabanı ile sunucudaki aynı üretimden olmalıdır, yoksa online maç "uygulamayı güncelle" hatası verir.

Dockerfile bu bilgisayarda Docker ile derlenmedi (Docker kapalıydı); içindeki adımlar temiz bir klasörde elle uygulanıp sunucu çalıştırılarak denendi.

### Canlı ortam (8 Ekim 2026)

- **Sunucu.** Contabo Cloud VPS (Almanya), Ubuntu 24.04, `37.60.248.54`. Şifreyle SSH kapalı, güvenlik duvarı yalnızca 22, 80 ve 443'e izin veriyor, otomatik güvenlik güncellemeleri ve fail2ban açık.
- **Alan adı.** `challengegoal.app` (Cloudflare, yalnızca DNS). API `https://api.challengegoal.app`, site `https://challengegoal.app` (gizlilik, koşullar, hesap silme sayfaları `deploy/site` altında).
- **Yerleşim.** `/opt/challengegoal` altında Docker Compose: `api` (depo kökündeki `Dockerfile`) ve TLS sertifikasını kendisi alan `caddy`. Veriler `/opt/challengegoal/data` (veritabanı ve `portraits/`), ayarlar aynı klasördeki `.env` (`TIME_ZONE`, `TRUST_PROXY=1`, `GOOGLE_CLIENT_IDS`, `APPLE_CLIENT_IDS`, `NOTIFICATIONS=1`).
- **Dağıtım.** Depo kökünde `sh deploy/deploy.sh` (görselleri de göndermek için `sh deploy/deploy.sh portraits`): son commit'i sunucuya açar, imajı orada derler, kapsayıcıları yeniler. Şema geçişleri açılışta uygulanır.
- **Gizli anahtarlar.** Mağaza anahtarları `/opt/challengegoal/secrets` altında durur (yalnızca kapsayıcının kullanıcısı okur), `api` kapsayıcısına salt okunur `/secrets` olarak bağlanır; yolları `.env` içindedir. Depoda ve imajda yoktur.
- **Yedek.** Her gece `deploy/backup.sh` veritabanının tutarlı kopyasını `/opt/challengegoal/backups` altına alır, 14 günden eskileri siler. Günlükler journald'da en çok 90 gün tutulur.
- **Uygulama derlemeleri.** Expo'nun bulut derlemesi (EAS, proje `@coptorbasi/challengegoal`): `development` (geliştirme istemcisi), `preview` (canlı sunucuya bağlı APK) ve `production` (mağaza) profilleri `app/eas.json` içinde. `google-services.json` depoda değil; EAS'ta `GOOGLE_SERVICES_JSON` dosya değişkeni olarak duruyor ve `app/app.config.ts` onu okuyor. iOS derlemesi ilk seferde etkileşimli çalıştırılır.

### Hesap kuralları

- **Misafir.** Oyuncu "misafir olarak devam et" dediğinde açılır. Kullanıcı adı `guest` ve altı rakamdır. Misafir hesabı cihaza bağlıdır ve kalıcı hesaba dönüşmez.
- **Ayrı hesaplar.** Misafir ile üye hesabı birbirinden bağımsızdır. Misafirken hesap açılamaz ve giriş yapılamaz; önce çıkış yapılır.
- **Kullanıcı adı.** 3–16 karakter; harf, rakam ve alt çizgi. Kayıtta seçilir ve sonradan değiştirilemez. Benzersizlik büyük-küçük harf ve aksan farkı gözetmez: "Çağrı_10" varken "cagri10" alınamaz.
- **Şifre.** En az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam. scrypt ile özetlenir, düz hâli hiçbir yerde saklanmaz. Kurallar `packages/protocol` içindedir; uygulama ve sunucu aynı denetimi kullanır.
- **Oturum.** Rastgele 256 bitlik jeton; veritabanında yalnızca özeti durur. Kullanıldıkça ömrü uzar.
- **Yanlış giriş.** Bilinmeyen e-posta ile yanlış şifre aynı cevabı ve aynı süreyi verir; hangi e-postaların kayıtlı olduğu anlaşılmaz.
- **İstek sınırı.** Giriş ve kayıt uçları adres başına dakikada 30 istekle sınırlıdır.
- **Google ve Apple.** Sunucu, sağlayıcının imzaladığı jetonu sağlayıcının açık anahtarlarıyla doğrular ve yalnızca bizim istemci kimliklerimize kesilmiş jetonları kabul eder. Uygulamada giriş ve kayıt ekranlarının altında "Google ile devam et" (iki platform) ve Apple düğmesi (yalnız iOS) var; yeni hesap ilk girişte kullanıcı adını seçer.
- **Apple jetonunun iptali (8 Ekim 2026).** Apple, hesap silen uygulamanın "Apple ile giriş" jetonunu da iptal etmesini şart koşar. Uygulama girişte Apple'ın verdiği tek kullanımlık yetki kodunu kimlik jetonuyla birlikte gönderir (`authorizationCode`, isteğe bağlı). Sunucu kodu `appleid.apple.com/auth/token` ucunda yenileme jetonuna çevirir ve `identities.refresh_token` sütununda saklar; her girişte yenisiyle değiştirir. Hesap silinince önce kayıtlar silinir, sonra jeton `auth/revoke` ucuna gönderilir. İstemci gizlisi, Apple ile giriş anahtarıyla (ES256) imzalanan beş dakikalık bir JWT'dir (`server/src/accounts/apple-tokens.ts`). Apple'a ulaşılamazsa giriş de silme de yine tamamlanır, hata günlüğe yazılır. Kod göndermeyen eski sürümle açılmış hesaplarda saklı jeton olmadığından iptal atlanır. Yenileme jetonu tek başına işe yaramaz; kullanmak için sunucudaki anahtar dosyası gerekir.
- **Hesap silme.** Hesap ekranındaki "Hesabı sil" onaydan sonra hesabı, girişleri, puanları, golleri, günlük ödül ve bulmaca kayıtlarını siler. Rakiplerin geçmişindeki maçlar kalır; silinen oyuncunun adı boşaltılır ve uygulama "Silinmiş oyuncu" yazar. Misafir silinince cihazdaki misafir anahtarı da unutulur.

### Şifre sıfırlama

- `POST /auth/password/forgot` e-postayı ve cihaz dilini alır, her durumda 204 döner. Adres kayıtlıysa 6 haneli kod üretilir, özeti `password_resets` tablosuna yazılır ve posta Resend ile arka planda gönderilir (`server/src/mail`). E-posta servisi ayarlı değilse `mail-unavailable` döner.
- `POST /auth/password/reset` e-posta, kod ve yeni şifreyi alır. Kod doğruysa şifre değişir, oyuncunun bütün oturumları silinir ve yeni bir oturum döner. Yanlış, süresi dolmuş ya da tükenmiş kodda `invalid-reset-code`.
- Sınırlar: kod 15 dakika geçerli, kod başına 5 yanlış deneme, bir adrese dakikada bir ve 24 saatte en çok 5 kod. İki uç da giriş uçlarıyla aynı istek sınırına tabidir.
- **Posta tasarımı (9 Ekim 2026).** Posta düz metnin yanında HTML olarak da gider (`server/src/mail/layout.ts`): koyu zemin, logo ve CHALLENGE GOAL yazısı, volt çerçeveli büyük kod, altında açıklama ve "sen istemediysen" notu. Tablo düzeni ve satır içi stiller kullanılır, yazı tipi yüklenemezse dar sistem yazı tipine düşer, görseller kapalıyken de okunur. Metne konan her değer kaçışlanır. Logo `https://challengegoal.app/img/mail-mark.png` adresinden gelir.
- Yalnızca e-postayla açılmış hesaplarda çalışır; Google ya da Apple ile açılan hesabın şifresi yoktur.

## Yönetim paneli

Kullanıcının isteğiyle eklendi (8 Ekim 2026): uygulamanın anlık ve günlük sayıları tek sayfada.

- **Adres ve erişim.** `https://api.challengegoal.app/admin` sayfası sunucunun içinden gelir (`server/src/admin/panel.html`); veriyi `GET /v1/admin/stats` ucundan alır ve 5 saniyede bir yeniler. İkisi de yalnızca `ADMIN_KEY_PATH` ile verilen anahtar ayarlıysa vardır. Uç, `Authorization: Bearer <anahtar>` ister; yanlış anahtar denemeleri adres başına dakikada 10 ile sınırlıdır. Sayfa önbelleğe alınmaz ve arama motorlarına kapalıdır; anahtar tarayıcıda saklanır.
- **Anlık sayılar.** Çevrimiçi oyuncu, son 5 dakikada oturumuyla istek atan hesaplardır (bellekte tutulur, sunucu yeniden başlayınca sıfırlanır). Süren maç, sırada bekleyen ve açık oda sayıları lobinin o anki durumundan gelir.
- **Veritabanından gelenler.** Hesaplar (üye, misafir, giriş yöntemi, bugün ve 7 günde yeni), aktif hesaplar (oturumun son kullanımına göre bugün, 7 ve 30 gün), maçlar (oyun ve tür bazında, gizli botlu sıra maçları), gol hareketleri, satın almalar (paket ve mağaza bazında; tutar Türkiye liste fiyatıyla tahmindir), ödül yazılan reklamlar, bulmaca, bildirim kayıtlı cihazlar ve son 14 günün günlük serisi. Günlük aktif oyuncu için ölçü, o gün günlük ödülünü alan hesap sayısıdır.
- Sonuç 3 saniye bellekte tutulur; birden fazla sekme açık olsa da sorgular tekrarlanmaz.

## Online maç

Maçın sahibi sunucudur: durumu sunucu tutar, her cevabı kendi futbol veritabanında doğrular, süreyi kendi sayar. Uygulama yalnızca hamle gönderir ve sunucudan gelen hamleleri ekrana işler; cevabın doğru olduğuna uygulama karar vermez.

### Bağlantı ve mesajlar

Uygulama `/v1/play` adresine WebSocket ile bağlanır. Mesajlar JSON'dur; tipleri `packages/protocol/src/play.ts` içindedir.

İlk mesaj selamlamadır: oturum jetonu, protokol sürümü ve uygulamadaki veri sürümü. Veri sürümü sunucununkinden farklıysa bağlantı "uygulamayı güncelle" hatasıyla kapanır; böylece iki tarafın oyuncu ve ızgara kimlikleri hep aynıdır. Jeton adres satırında değil mesajın içinde taşınır.

| Uygulamadan sunucuya | Anlamı |
|---|---|
| `hello` | Selamlama: jeton, protokol sürümü, veri sürümü |
| `queue` | Rastgele rakip sırasına gir (mod, pazar, zorluk; mod verilmezse XOX) |
| `play-bot` | Sıraya girmeden bota karşı maç aç (mod, pazar, zorluk) |
| `create-room` | Arkadaş odası kur (mod, pazar, zorluk) |
| `join-room` | Kodla odaya katıl |
| `cancel` | Sıradan ya da kurulan odadan çık |
| `answer` | XOX hamlesi: maç, sıra numarası, hücre, oyuncu kimliği |
| `act` | Yeni modların hamlesi: maç ve moda özgü eylem (düelloda el gönderme ya da kart oynama, Kadro Kur'da futbolcu seçme, Hangisi Yüksek'te kart seçme, Zincir'de futbolcu söyleme) |
| `joker` | Joker kullan: maç, joker, gerekirse hedef (hücre ya da kart) |
| `leave` | Maçtan ayrıl (hükmen kaybeder) |
| `ping` | Bağlantıyı canlı tut |

| Sunucudan uygulamaya | Anlamı |
|---|---|
| `ready` | Selamlama kabul edildi |
| `queued`, `room`, `idle` | Sırada, oda kuruldu (kod), boşta |
| `match` | Maçın tam durumu: ızgara, taraflar, kullanıcı adları, hamle listesi, kalan süre. Maç başında ve yeniden bağlanınca gelir |
| `move` | Bir hamle: cevap (alındı, yanlış, daha önce kullanıldı) ya da süre dolması; yanında yeni sıranın kalan süresi |
| `session` | Yeni modlarda maçın tam durumu: mod, taraflar, kullanıcı adları ve oyuncunun görünümü. Maç başında ve yeniden bağlanınca gelir |
| `view` | Yeni modlarda her değişiklikten sonra oyuncunun görebildiği durum; mod alanıyla birlikte gelir. Gizli bilgi (rakibin eli, açılmamış soru, gelecek turların kulübü) içinde yoktur |
| `finished` | Sonuç: kazanan ve neden (üçlü, hücre sayısı, puan, hükmen). Puanlı maçta her oyuncuya kendi puan değişimi, yeni puanı, toplamı, seviyesi ve kazandığı gol de gelir |
| `opponent` | Rakibin bağlantısı koptu ya da geri geldi |
| `joker` | Bir joker kullanıldı: taraf, joker, o taraftaki kullanım sayısı; kullanana açılan bilgi ve yeni gol bakiyesi |
| `error` | Hata kodu |

Sunucu, sıranın kalan süresini milisaniye olarak gönderir; uygulama bunu kendi saatine ekler. İki cihazın saatinin farklı olması sayacı bozmaz.

### Bot kadrosu (9 Ekim 2026)

Online sırada 6-11 saniyede gerçek rakip bulunamazsa karşıya bot gelir ve oyuncu gibi görünür. Eskiden her maçta yeni bir ad üretiliyordu ve bot hiçbir yerde kayıtlı değildi; oyuncu kendisini yenen "rakibi" lider tablosunda bulamıyordu. Kullanıcının kararıyla botlar kalıcı bir kadrodan gelir.

- **Hesap olarak bot.** Her bot `users` tablosunda sıradan bir satırdır ve `bots` tablosunda (kullanıcı, pazar, oluşturulma zamanı) işaretlidir. Böylece maç geçmişi, puan (`ratings`) ve lider tablosu hiçbir özel kod gerekmeden tutarlı kalır; bot adları gerçek oyunculara verilemez. Botun şifresi, kimliği ya da oturumu yoktur, giriş yapılamaz.
- **Kadro.** `server/src/play/roster.ts`. Pazar başına 48 bot, o pazarda ilk bot maçı gerektiğinde oluşturulur. Gerçek oyuncu arttıkça kadro küçülür: puan toplamış her 25 gerçek oyuncu için bir bot devreden çıkar, en az 12 bot kalır. Devreden çıkan botun geçmişi ve puanı durur.
- **Seçim.** Sıradaki oyuncuya, o anda başka maçta olmayan ve oyuncunun son 8 maçında karşılaşmadığı botlardan rastgele biri verilir. Koltukta `userId` yine boştur (odalar botu böyle tanır), kalıcı kimlik `botId` alanındadır.
- **Puan.** Bota karşı online maç puanlıdır (kullanıcının kararı). Bot da aynı kuralla puan kazanır ve kaybeder; gol kazanmaz. Botun gücü eskisi gibi oyuncunun son sonuçlarına göre ayarlanır.
- **Tabloda ilk üç oyuncularındır.** Lider tablosu botları da listeler, ama puanı olan oyuncuların ilk üçünün altında gösterir: botun görünen puanı, üçüncü oyuncunun (üçten az oyuncunun puanı varsa sonuncusunun) puanının bir eksiğini aşamaz. Hiçbir oyuncunun puanı yoksa bot kendi puanıyla görünür.
- **Yönetim paneli.** Kullanıcı sayıları botları saymaz.
- **Açıklama.** Kullanım koşullarının 1. maddesi ve sitedeki "Rakiplerim hep gerçek oyuncular mı?" sorusu, rakip bulunamadığında yapay zekâ rakiple eşleşilebileceğini, bu maçların puanlı olduğunu ve bu rakiplerin tabloda yer alabileceğini söyler. Site, mağaza metni ve uygulama metinleri "gerçek rakip" vaat etmez.
- "Bota karşı" seçeneğiyle açılan maçlar değişmedi: rakip açıkça "Bot" adıyla görünür ve puansızdır.

### Sunucu parçaları

| Dosya | Görevi |
|---|---|
| `src/play/gateway.ts` | Bağlantıyı kabul eder, selamlamayı ve jetonu denetler, mesajları ayrıştırır, bağlantı başına mesaj sınırı uygular |
| `src/play/messages.ts` | Gelen mesajın biçimini doğrular |
| `src/play/lobby.ts` | Eşleştirme sırası, arkadaş odaları, oyuncu durumu, kopma ve geri dönüş; moddan bağımsız |
| `src/play/live-room.ts` | Lobinin bir maçtan beklediği arayüz (`LiveRoom`) ve oda üreticisinin aldığı bağlam (`RoomContext`) |
| `src/play/grid-room.ts` | XOX oda üreticisi: ızgara seçer, maç odasını ve botu bağlar |
| `src/play/room.ts` | Tek bir XOX maçı: durum, cevap doğrulama, sıra süresi, sonuç |
| `src/play/duel-room.ts` | Kart Düellosu oda üreticisi: konsept seçimi, el doğrulama ve tamamlama, soru seçimi, tur ve açılış süreleri, bot |
| `src/play/draft-room.ts` | Kadro Kur oda üreticisi: kulüp sırası, seçim doğrulama (kulüp, mevki, asist verisi), tur süresi ve ara, bot |
| `src/play/higher-room.ts` | Hangisi Yüksek oda üreticisi: soru havuzu (zorluk başına önbellekte), değer farkı kuralı, eller, bot |
| `src/play/chain-room.ts` | Zincir oda üreticisi: başlangıç futbolcuları, ortak kulüp denetimi, kısalan süre, turlar, bot |
| `src/play/rare-room.ts` | En Az Bilinen oda üreticisi: ızgaradan ölçütler, gizli cevaplar, doğruluk ve bilinirlik, bot |
| `src/play/auction-room.ts` | Açık Artırma oda üreticisi: zengin hücre seçimi, teklif ve "Say bakalım", ispat süresi, bot |
| `src/play/top-ten-room.ts` | İlk 10 oda üreticisi: liste seçimi, sıralama ve yakın ıskalar, canlar, bot |
| `src/play/career-room.ts` | Kariyer Yolu oda üreticisi: gizli futbolcu seçimi, yıllara göre kulüp sırası, puan, bot |
| `src/play/bot.ts` | Bot rakip: ad üretimi, seviye seçimi, hamle zamanlaması |
| `src/play/history.ts` | Biten maçları kaydeder ve oyuncuya listeler (oyuna göre süzme, sayfalama, maçtan kazanılan gol) |
| `src/progress/points.ts` | Güç puanı ve görünen puan değişimi, seviye eşiği koruması, gün sınırı |
| `src/progress/store.ts` | Puanlı maçın sonucunu puana ve gole çevirir; ilerleme özeti; günlük ödül |
| `src/progress/wallet.ts` | Gol bakiyesi ve kayıt defteri; ilk açılışta hoş geldin hediyesi |
| `src/football/library.ts` | Futbol veritabanını salt okunur açar: ızgara seçimi, cevap doğrulama, bilinen cevaplar, düello konseptleri ve kart değerleri |

Sunucu ve uygulama aynı SQL ifadelerini kullanır; ifadeler `packages/football-data` paketindedir. Kural motoru da ortaktır (`packages/game-core`).

### Kurallar

- **Eşleştirme.** Sıra mod ve pazar başınadır; bekleyen her oyuncunun seçtiği zorluk ayrıca tutulur. Sıraya giren oyuncu, bekleyenlerden o oyundaki gizli güç puanı kendisine en yakın olanla eşleşir; ancak fark, bekleyenin kabul aralığı içinde olmalıdır (150, beklenen her saniye 75 genişler). Önce aynı zorluk aranır. Komşu zorluk (Kolay–Orta, Orta–Zor) ancak biri 3 saniye beklediyse eşleşir; sorular düşük olanın zorluğunda gelir, puan çarpanı da onunkidir. Kolay ile Zor hiç eşleşmez. Bir oyuncu aynı anda yalnızca bir durumda olabilir (boşta, sırada, oda sahibi, maçta); maçtayken sıraya giremez.
- **Tek bağlantı.** Aynı hesap ikinci bir cihazdan bağlanırsa eski bağlantı kapatılır ve yeni bağlantı kaldığı yerden devam eder.
- **Bot.** Sırada 6–11 saniye içinde rakip çıkmazsa maç bota karşı başlar. Bot, protokolde hiçbir yerde işaretlenmez; gerçek oyuncu gibi kullanıcı adı taşır (pazara göre ad havuzu, bir kısmı misafir adı biçiminde) ve hamlelerini 2,5–9 saniye düşünerek yapar. Bilemediği sırada bazen yanlış ama akla yatkın bir oyuncu söyler (satıra uyan, sütuna uymayan), bazen süreyi doldurur. Oyuncu ana ekranda "Bota karşı" seçerse uygulama `play-bot` gönderir; sunucu sıraya hiç sokmadan aynı botla maçı hemen açar. Bu maçta botun adı "Bot"tur ve maç kaydında türü `bot` olarak tutulur.
- **Bot seviyesi.** Lobide belirlenir ve odaya verilir; maç kaydına da yazılır (`matches.bot_level`). Seçilen zorlukla başlar. Oyuncunun **aynı oyundaki** son beş bot maçına bakılır (arkadaş maçları ve başka oyunlar sayılmaz); en az üç sonuç varsa, galibiyet oranı hedefin 0,2 üstündeyse bir seviye güçlenir, 0,2 altındaysa zayıflar. Hedef oyuncunun kazanma oranıdır: bota karşı Kolay %65, Orta %50, Zor %35; gizli botta %50 (8 Ekim 2026).
- **Sıra süresi.** 20 saniye. Sunucu, ağ gecikmesi için 1,5 saniye pay bırakır; süre dolunca sırayı kendisi geçirir.
- **Kopma.** Maçtaki oyuncunun bağlantısı koparsa rakibe bildirilir ve maç sürer. 30 saniye içinde dönerse maçın tam durumu gönderilir. Dönmezse hükmen kaybeder. Uygulama kopunca kendiliğinden yeniden bağlanmayı dener (artan aralıklarla, yaklaşık 20 saniye). Sunucuya hiç bağlanamamışsa iki kısa denemeden sonra vazgeçer; 8 saniyede hazır olmayan bağlantı kopmuş sayılır.
- **Ayrılma.** Maç ekranından çıkan oyuncu hükmen kaybeder.
- **Arkadaş odası.** Oda kuran oyuncuya beş karakterli bir kod verilir (karışabilecek 0, O, 1, I harfleri yoktur). Kod on dakika geçerlidir. Oda sahibi genel sırayla eşleşmez.
- **Maç kaydı.** Her biten maç `matches` tablosuna yazılır (mod sütunuyla). Oyuncu kendi maçlarını `GET /matches` ile alır; rakibin bot olup olmadığı kayıtta da tutulmaz. Düelloda hücre sayısı sütunlarında puanlar durur.
- **Kart Düellosu.** Kurallar ve süreler [oyun-modlari.md](oyun-modlari.md) belgesinde. Sunucu: el kilitlenene kadar rakibin yalnızca hazır olup olmadığı görünür; tur sırasında rakibin yalnızca kart oynayıp oynamadığı görünür, kart kimliği tur çözülünce gelir. Gönderilen el en çok 7 farklı kart içerebilir ve hepsi konsepte uymalıdır; eksik kalanı sunucu tamamlar. Maçın 7 sorusu hep farklıdır: önce iki elin bütün kartlarında değeri bilinen ölçütler (yeterliyse yalnızca bir yaş sorusuyla), eksik kalırsa en çok kartta bilinen ölçütler alınır ve sıra karıştırılır. Konsept üyeliği ve kart değerleri `packages/football-data/src/duel.ts` içindeki ortak ifadelerle hesaplanır; uygulama aynı ifadeyle konsepte göre arama yapar.

### Uygulama parçaları

| Dosya | Görevi |
|---|---|
| `src/online/play-client.ts` | Bağlantı istemcisi: selamlama, canlı tutma, kopunca yeniden bağlanma |
| `src/features/match/online.ts` | Sunucu mesajlarını maç oturumuna çevirir (yerel oyunla aynı oturum yapısı) |
| `src/features/match/use-online-match.ts` | Online maçın kancası: arama, oda, oynama, hata durumları; XOX ve düello mesajlarını birlikte işler |
| `src/features/duel/*` | Kart Düellosu: görünüm (`duel-view`), kart seçimi (`hand-picker`), tur masası (`duel-table`), kapalı kart, sesler ve titreşim, konsept başlıkları ve değer biçimleri (`labels`) |
| `src/features/draft/*` | Kadro Kur: görünüm (`draft-view`), saha dizilişli kadro (`lineup-board`), sesler ve titreşim |
| `src/features/higher/*` | Hangisi Yüksek: görünüm, sesler ve titreşim |
| `src/features/chain/*` | Zincir: görünüm (halka şeridi, son halka, bağlayan kulüp), sesler ve titreşim |
| `src/features/rare/*` | En Az Bilinen: görünüm (ölçüt, gizli cevap, açılışta bilinirlik çubukları), sesler ve titreşim |
| `src/features/auction/*` | Açık Artırma: görünüm (teklif sayacı, ispat listesi), sesler ve titreşim |
| `src/features/top-ten/*` | İlk 10: görünüm (canlar, 10 satırlık liste), sesler ve titreşim |
| `src/features/career/*` | Kariyer Yolu: görünüm (yıllarıyla kulüp listesi, cevap kartı), sesler ve titreşim |
| `src/features/games.ts` | Oyun listesi, adları ve ana ekran metinleri; mod görünümlerinin ortak yardımcıları |
| `src/features/match/online-lobby.tsx` | Rakip arama, oda kodu ve hata ekranları |
| `src/features/match/match-view.tsx` | Yerel ve online maçın ortak görünümü |
| `src/app/friend.tsx` | Oda kurma ve kodla katılma ekranı |
| `src/features/account/match-history.tsx` | Hesap ekranındaki son beş maç ve geçmiş ekranına bağlantı |
| `src/features/account/match-row.tsx` | Maç satırı: oyun, rakip, tür, sonuç, skor, puan değişimi, kazanılan gol |
| `src/app/history.tsx` | Geçmiş ve istatistik ekranı |
| `src/features/progress/*` | İlerleme kancası (ana ekran her görünüşünde ve uygulama öne gelince günlük ödülü ister), ana ekran rozeti, günlük ödül penceresi |
| `src/features/match/leave-guard.tsx` | Süren maçtan çıkışı yakalar (çık düğmesi ve Android geri tuşu) ve onay ister |
| `src/features/match/match-reward.ts` | Maç sonu puan ve gol bilgisini sonuç ekranına taşıyan bağlam |
| `src/features/jokers/*` | Joker bağlamı (kullanımlar, bakiye, bekleyen istek, hata), joker çubuğu, açılan bilginin metne çevrilmesi (yerel veritabanından ad, kulüp, ülke) |

Online maç için hesaba bağlı olmak gerekir (misafir ya da üye). Sunucuya ulaşılamıyorsa online kartlar açıklayıcı bir hata ekranı ve "Tekrar dene" düğmesi gösterir; XOX'un internetsiz bot maçı etkilenmez.

## Puan, seviye ve gol

Kurallar (7 Ekim 2026):

- **Hangi maçlar sayılır.** Yalnızca online sıra maçları (`kind = queue`), rakip çıkmayınca gelen gizli bot dahil. "Bota karşı" (`bot`) ve arkadaş odası (`room`) puan ve gol vermez. Gizli botun güç puanı oyuncununkinin ±60 yakınından seçilir.
- **İki sayı (8 Ekim 2026).** Her oyunda iki ayrı sayı tutulur. **Güç puanı** gizlidir, 1000'den başlar, klasik Elo ile iki yönde eşit değişir: beklenen sonuç `1 / (1 + 10^((rakip − sen) / 400))`, değişim `40 × (sonuç − beklenen)` (eşit güçte ±20). Eşleştirme ve gizli botun puanı buna göredir. **Görünen puan** 0'dan başlar; seviye ve lider tablosu bundan çıkar. Rakibin gücüne göre hesaplanır: galibiyet `40 × (1 − beklenen) + 5` (en az 10) ve zorluğa göre 1 / 1,2 / 1,4 ile çarpılır; mağlubiyet `40 × beklenen × 0,5`; beraberlik yalnızca güçsüz taraf için artı, diğerine 0. Eşit güçte kolayda galibiyet +25, mağlubiyet −10. Görünen puan sıfırın altına inmez ve kayıp, toplam puanı ulaşılan seviyenin eşiğinin altına indiremez; seviye hiç düşmez. Maçtan ayrılmak ya da kopup dönmemek mağlubiyettir.
- **Toplam ve seviye.** Toplam puan dokuz oyunun puanlarının toplamıdır. Seviye `n`'nin alt sınırı `50 × n × (n − 1)`: 1. seviye 0, 2. seviye 100, 3. seviye 300, 4. seviye 600, 5. seviye 1.000.
- **Gol.** Her hesabın cüzdanı ilk kez açıldığında 15 gol hediye yazılır (eski hesaplar dahil). Hesabın ilk günlük ödülü yanıtında `welcomeGoals` alanı gelir; uygulama hediyeyi o pencerede söyler. Puanlı galibiyet 1 gol. Günlük ödül art arda günlerde 1, 2, 2, 3, 3, 4, 5 gol; 7. günden sonra her gün 5. Bir gün kaçırılırsa seri 1'den başlar. Gün sınırı sunucunun `TIME_ZONE` ayarındaki saat dilimine göredir (varsayılan Europe/Istanbul).
- **Kayıt defteri.** Bakiye yalnızca kayıt defterine yazılan hareketle değişir; aynı dayanakla ikinci kez gol yazılamaz. Satın alma `purchase` nedeniyle yazılır (bkz. Gol satın alma); reklam ödülü `ad` nedeniyle yazılır (bkz. Ödüllü reklam).
- **Jokerler.** Uygulama `joker` mesajı gönderir (maç, joker, gerekirse hedef: XOX'ta hücre, Kart Düellosu'nda kart). Lobi sırayla denetler: joker bu modun mu, oyuncu bu maçta 2 jokeri kullandı mı, bakiyede 3 gol var mı. Sonra odanın `useJoker` yöntemi jokerin şu an geçerli olup olmadığına bakar ve etkisini uygular (süre uzatma, can, pas, kart değişimi) ya da gizli bilgiyi döndürür. Ancak bundan sonra gol düşülür (neden `joker`, dayanak maç, taraf ve sıra). Kullanana bilgiyle birlikte, rakibe bilgisiz bir `joker` mesajı gider; yeniden bağlanan oyuncuya maçın jokerleri `replay` işaretiyle tekrar gönderilir. Ek süreler `EXTRA_TIME_SECONDS` tablosundadır; XOX'ta uygulama sayacı joker mesajıyla kendisi uzatır, diğer modlarda yeni süre görünümle gelir.

Uygulamada: ana ekranın sol üstünde seviye, toplam puan ve gol; oyun seçiminin yanında seçili oyundaki puan. Ana ekran her görünüşünde ve uygulama arka plandan dönünce günlük ödülü ister; sunucu günde bir kez verir, ödül varsa pencere çıkar. Maç sonunda puan değişimi, kazanılan gol ve seviye atlama gösterilir. Geçmiş ekranı genel sayıları, oyun oyun puan ve sonuçları, oyuna göre süzülen maç listesini ve gol hareketlerini gösterir.

## Gol satın alma

Paketler `packages/protocol/src/store.ts` içindedir: `goals_cg_30`, `goals_cg_100`, `goals_cg_250`, `goals_cg_600`. Fiyat uygulamada ya da sunucuda tutulmaz; mağazadan gelir.

Akış:

1. Uygulama mağaza ekranında (`app/src/app/store.tsx`, `features/store`) `expo-iap` ile ürünleri ve fiyatlarını alır, satın almayı başlatır.
2. Mağaza satın almayı bildirince uygulama `POST /purchases` ile kanıtı gönderir: iOS'ta işlem kimliği, Android'de satın alma jetonu.
3. Sunucu kanıtı mağazaya sorar (`server/src/store`). Apple için App Store Server API: önce canlı uç, bulunamazsa ya da anahtar reddedilirse sandbox; uygulama kimliği, ürün ve iade durumu denetlenir. Google için Play Developer API: servis hesabıyla alınan erişim jetonu bellekte tutulur, satın almanın tamamlanmış olması aranır.
4. Sunucu `purchases` tablosuna ve gol kayıt defterine tek işlemde yazar, yeni bakiyeyi döner.
5. Uygulama işlemi mağazada kapatır (tüketir); paket yeniden alınabilir olur.

Kurallar:

- Misafir satın alamaz (`guest-purchase`); mağaza ekranı misafire paketleri göstermez, hesap ekranına yönlendirir.
- Aynı satın alma (mağaza ve işlem kimliği) yalnızca bir kez gol yazar. Aynı hesaptan tekrar gelirse `granted: 0` ile güncel bakiye döner; başka hesaptan gelirse `purchase-used`.
- Mağaza cevap vermezse, sınır koyarsa ya da anahtarı reddederse `store-unavailable`; mağaza satın almayı tanımazsa `purchase-invalid`. Reddedilen doğrulamalar günlüğe uyarı olarak yazılır.
- Uygulama işlemi yalnızca gol yazıldığında ya da `purchase-used` cevabında kapatır. Diğer hatalarda işlem açık kalır; mağaza ekranı her açıldığında kapatılmamış satın almalar (iOS'ta bekleyen işlemler, Android'de tüketilmemiş satın almalar) yeniden sunucuya gönderilir. Android'de açık kalan satın almayı Google üç gün sonra kendisi iade eder.
- Onay bekleyen ödeme (Android) için gol yazılmaz; oyuncuya beklediği söylenir, onaylanınca sonraki açılışta işlenir.
- Mağaza modülü olmayan derlemede (Expo Go) ekran "bu sürümde mağaza yok" der.

## Ödüllü reklam

Reklam başına 2 gol, oyuncu başına günde en çok 5 reklam (`packages/protocol/src/ads.ts`). Misafir de izleyebilir.

- **Bildirim.** Ödülü Google bildirir: reklam bitince AdMob, `GET /ads/reward` adresini sorgu parametreleriyle çağırır (`ad_unit`, `user_id`, `transaction_id`, sonda `signature` ve `key_id`). Uygulama reklamı yüklerken `user_id` olarak oyuncunun kimliğini verir.
- **İmza.** Sunucu (`server/src/ads`), sorgunun `&signature=` öncesindeki kısmını Google'ın açık anahtarıyla (ECDSA, SHA-256) doğrular. Anahtarlar `gstatic.com/admob/reward/verifier-keys.json` adresinden alınır, bir gün bellekte tutulur; bilinmeyen anahtar kimliğinde yeniden istenir.
- **Kurallar.** Reklam birimi `ADMOB_AD_UNITS` içinde olmalı (yoksa başkasının AdMob hesabı bizim adresimize gol yazdırabilirdi), oyuncu var olmalı. Aynı `transaction_id` ikinci kez gol yazmaz (Google başarısız bildirimi yeniden dener). Günlük sınır `ad_rewards` tablosundaki o günün (sunucu saat dilimi) kayıtlarından sayılır.
- **Cevaplar.** İmzasız istek (AdMob panelindeki adres yoklaması) ve işlenen ya da yok sayılan her imzalı istek 200; sahte imza 400. Anahtarlar alınamazsa 500 döner ve Google yeniden dener.
- **Puan koruma (8 Ekim 2026).** Puanlı maçı kaybeden oyuncuya sonuç ekranında 10 saniyelik geri sayımla "Puanını koru" düğmesi çıkar. Reklam, `custom_data` alanında `protect:<maç kimliği>` ile yüklenir; bildirim gelince sunucu o maçta oyuncunun kaybettiği görünen puanı geri yazar, maçın puan değişimini sıfırlar (haftalık tablo da düzelir) ve `point_protections` tablosuna kaydeder. Gizli güç puanı değişmez. Maç başına bir kez, maçtan sonraki 15 dakika içinde geçerlidir; günlük sınırı yoktur ve gol reklamlarının günlük sınırına sayılmaz. Uygulama sonucu `GET /matches/<kimlik>/protection` ile sorar.
- **Durum.** `GET /ads` oyuncuya bakiyeyi, bugün kalan reklam hakkını ve ödülü verir; uygulama reklamdan sonra golün yazıldığını buradan görür.

**Uygulama.** `react-native-google-mobile-ads` kullanılır; AdMob uygulama kimlikleri `app/app.json` içindeki eklenti ayarında, reklam birimi kimlikleri `app/src/constants/ads.ts` içindedir. Kütüphane yalnızca yerel modülü olan derlemede yüklenir (`adsBuiltIn`); Expo Go'da reklam satırı görünmez.

- Mağaza ekranındaki satır (`features/store/rewarded-goals.tsx`) açılışta rıza akışını çalıştırır (`AdsConsent.gatherConsent`), reklam istenebiliyorsa SDK'yı başlatır ve ödüllü reklamı önceden yükler. Geliştirme derlemesinde Google'ın deneme reklam birimi kullanılır; onun bildirimi sunucuda gol yazmaz.
- Reklam, oyuncunun kimliği `user_id` olarak verilerek yüklenir. Oyuncu ödülü hak edip reklamı kapatınca uygulama `GET /ads` ucunu 1,5 saniye arayla en çok 8 kez sorar; kalan hak azaldıysa bakiyeyi günceller, azalmadıysa "ödülün birazdan eklenecek" der. Gol her durumda sunucudaki bildirimle yazılır.
- Satırın durumları: hazır, hazırlanıyor, bugünlük bitti, şu an reklam yok (dokununca yeniden dener).
- Rıza seçeneği gereken oyuncuya hesap ekranında "Reklam tercihleri" bağlantısı gösterilir (`features/account/ad-privacy-link.tsx`).
- iOS'ta izleme izni metni ayarda hazırdır; izin penceresi AdMob'da IDFA açıklama mesajı yayınlanınca çıkar.

## Kulüp armaları

Gerçek kulüp logoları kullanılmaz (tescilli marka). Onun yerine her kulübe aynı kalkan kalıbından, kendi renkleri, basit bir desen ve kısaltmasıyla üretilen bir arma çizilir (8 Ekim 2026; rakip uygulamalardaki yaklaşımın aynısı).

- **Veri.** `app/assets/data/club-crests.json`: kulüp kimliği başına kısaltma (2-3 harf), desen (`plain`, `halves`, `diagonal`, `stripes`, `hoops`, `sash`, `band`, `pale`), iki renk ve isteğe bağlı kenar rengi. Veritabanındaki 219 kulübün hepsi elle derlendi; Wikidata'nın "resmî renk" verisi yalnızca 122 kulüpte vardı ve desen içermiyordu.
- **Çizim.** `features/clubs/crest-svg.ts` armayı SVG metni olarak üretir; `components/club-crest.tsx` bunu Skia ile çizer ve kısaltmayı şeridin üstüne yazar. Koyu kenar renkleri koyu zeminde kaybolmasın diye açık renkle değiştirilir.
- **Kullanıldığı yerler.** XOX ızgarasının kulüp başlıkları, Kariyer Yolu adımları, Zincir'in bağlantı satırı, Kadro Kur'un tur kulübü.
- Yeni kulüp eklenince dosyaya satırı da eklenmelidir; test, veritabanındaki her kulübün arması olduğunu denetler.

## Marka görselleri ve animasyonlar

Logo, 9 Ekim 2026'da kullanıcının getirdiği 3B top tasarımına geçti: siyah-beyaz klasik top, üzerinde ChallengeGoal bandı, volt (lime) vurgular. Tasarım three.js ile yazılmış bir prototip olarak geldi (`data/branding/animation/handoff/`); bütün geometri kodla üretiliyor, doku dosyası yok.

| Kullanım | Tasarımdaki konsept | Dosya |
|---|---|---|
| Uygulama ikonu, açılış ekranı, Play simgesi, tanıtım görseli | Meteor (halka ve hız çizgileri), durağan | `data/branding/artwork/emblem.png` → `icons.py`, `store_assets.py` |
| Kazanılan maçın sonuç ekranı | Gol: top ağlara gider, direkler yanar (2,6 sn döngü) | `app/assets/animations/goal-win.webp` |
| Kaybedilen maçın sonuç ekranı | Kupa: top kupayı devirir (3,2 sn döngü) | `app/assets/animations/trophy-loss.webp` |
| Tanıtım videosu | Alev (1.400 piksel kareler) ve Gol | `data/build/animation/frames/alev-large`, `frames/gol` |
| Sitenin başlığı | Alev: alev kuyruklu top + CHALLENGE GOAL yazısı (5,2 sn döngü) | `deploy/site/img/flame.webp`, hareketi azalt ayarı açıksa `flame.png` |
| Gol simgesi ve gol paketi simgeleri | Yalnızca top | `app/assets/images/goal-ball.png` (40 dp ve üstü, bantlı), `goal-ball-plain.png` (küçük boyutlar, bantsız), `data/branding/artwork/ball.png` |

- **Neden hazır çizim.** Animasyonlar uygulamada gerçek zamanlı 3B olarak değil, tasarımın kendi sahnesinden kare kare alınmış şeffaf animasyonlu WebP olarak oynar. `expo-image` bunu iki platformda da oynatır; yeni yerel modül, three.js ve 3B sahnenin eski telefonlardaki yükü gerekmez, görüntü tasarımla birebir aynıdır. Bedeli sabit çözünürlük (600 piksel genişlik) ve dosya boyutudur (1,4 MB ve 0,6 MB).
- **Kareleri alma.** `data/branding/animation/capture.mjs` prototipi yerel bir sunucudan başsız Chrome'da açar (yazılımla çizim, ekran kartına dokunmaz) ve sayfaya `driver.js` dosyasını ekler. Sürücü `requestAnimationFrame` ile `performance.now` işlevlerini ele alıp zamanı kendisi ilerletir; böylece her kare belirli bir ana denk gelir ve döngü kusursuz kapanır. Arka plan şeffaf yapılır, kareler PNG olarak sunucuya gönderilir (`data/build/animation/frames`). Top döngüsü tam bir tur olduğu için Alev 5.236 ms sürer; alev dalgasının periyodu bunun tam beşte biridir.
- **Kodlama.** `encode.py` kareleri ortak görünür alana kırpar, küçültür ve animasyonlu WebP yazar (kalite 70, alfa kalitesi 60); top görsellerini de buradan çıkarır.
- **Yeniden üretme.** `data/branding` içinde: `node animation/capture.mjs`, `python animation/encode.py ../../app/assets ../../deploy/site/img`, ardından görsel ortamının Python'ıyla `icons.py <klasör>` ve `store_assets.py ../build/store ../../deploy/site/img`.
- **Sonuç ekranı.** `features/match/result-scene.tsx` sahneyi başlığın üstünde gösterir; genişlik en çok 340 dp, yükseklik ekranın en çok %24'ü. Beraberlikte sahne yoktur. Sekiz oyunun hepsi aynı sonuç ekranını kullanır.
- **Dikkat.** `deploy/.gitattributes` klasördeki her dosyayı metin sayar; yeni bir ikili dosya türü eklenince (9 Ekim'de `.webp`) oraya `binary` satırı yazılmalıdır, yoksa depodaki kopya bozulur.

### Tanıtım videoları ve paylaşım görseli

Sosyal medya için tanıtım malzemesi `data/branding/promo/` içindeki tek bir sayfadan üretilir; çıktılar `data/build/promo/` altına yazılır (depoya girmez).

| Çıktı | Boyut | Dosya |
|---|---|---|
| Uzun video: dört oyunun oynanışı | 1080×1920, 30 kare/sn, 59 sn, H.264, sessiz ses kanalı | `challengegoal-<dil>-long.mp4` |
| Kısa video | aynı biçim, 25,5 sn | `challengegoal-<dil>.mp4` |
| Akış görseli | 1080×1350 | `challengegoal-<dil>-post.png` |
| Paylaşım metni | — | `challengegoal-<dil>-caption.txt` (elle yazılır) |

- **Sayfa.** `promo.html` (görünüm ve hareketler), `promo.js` (sahneler, kurgular, örnek maçlar), `texts.json` (dil bazında metinler). Sahneler: açılış, XOX, Kart Düellosu, Açık Artırma, Zincir, sekiz oyun, özellikler, kapanış. Uzun kurgu açılış, dört oyun, sekiz oyun ve kapanıştan; kısa kurgu açılış, XOX, sekiz oyun, özellikler ve kapanıştan oluşur (`CUTS`).
- **Oyun sahneleri.** Uygulamanın gerçek ekran kaydı değildir; ekranlar emülatör görüntülerine bakılarak sayfada yeniden çizilmiştir ve metinler uygulamadaki çevirilerle aynıdır. Örnek maçlardaki bilgiler veritabanından alınmıştır: Kart Düellosu'nda "Süper Lig tarihindeki yabancılar" konsepti, Eto'o 368 gole karşı Gómez 333 ve Osimhen (1998) ile Džeko (1986); Açık Artırma'da Real Madrid CF × Brezilya için Ronaldo, Kaká, Marcelo, Casemiro, Rodrygo; Zincir'de Arda Güler, Mbappé (Real Madrid CF), Messi (Paris Saint-Germain), Arda Turan (FC Barcelona).
- **Kare kare yakalama.** Bütün hareketler CSS animasyonudur ve duraklatılmış durur. `capture.mjs` sayfayı başsız Chrome'da açar (yazılımla çizim, ekran kartına dokunmaz), Chrome'un uzaktan denetim ucuna bağlanır ve her kare için `seek(saniye)` çağırır: animasyonların zamanı o ana alınır; top kareleri, yazılan adlar, sayaçlar ve skorlar güncellenir; ekran görüntüsü kaydedilir. Sonuç gerçek zamandan bağımsızdır. Araç kendi önceliğini düşürür, kodlamada iki iş parçacığı kullanır, iş bitince ara kareleri siler.
- **Komutlar** (depo kökünde): `node data/branding/promo/capture.mjs video tr cut=long`, `node data/branding/promo/capture.mjs video tr`, `node data/branding/promo/capture.mjs poster tr`. Belirli anları görmek için `at=8.8,16` eklenir. Kapanıştaki mağazalar `stores=play` ya da `stores=apple` ile teke indirilir (dosya adına eklenir).
- **Önce gereken.** Alev topunun büyük kareleri: `node data/branding/animation/capture.mjs alev-large` (1400 piksel, 79 kare).
- **Başka dil.** `texts.json` içine o dilin metinleri eklenir ve komut o dil koduyla çalıştırılır; uzun satırlar kendiliğinden küçülür.
- **Kurallar.** "Zorunlu reklam yok" açılışın ilk saniyelerinde ve kapanışta yer alır (uygulamada yalnızca oyuncunun kendi açtığı ödüllü reklam vardır). Malzeme uygulama yayımlandıktan sonra paylaşılacağı için "yakında" yazmaz; kapanış "Ücretsiz indir" der. Videolardaki futbolcuların fotoğraf kaynakları sitenin "Görsel kaynakları" listesinde ve paylaşım metninde sayılır; kapanışta görsellerin yapay zekâ çizimi olduğu yazar. Videoda müzik yoktur; paylaşan kişi platformun kendi müzik kitaplığından ekler.

## Bildirimler

Uygulama `expo-notifications` ile izin ister (ilk günlük ödül penceresi kapandıktan sonra), Expo bildirim anahtarını alır ve cihaz diliyle birlikte sunucuya kaydeder. Bildirime dokununca bulmaca bildirimi bulmacayı, haftalık sonuç lider tablosunu açar. Expo Go'da bildirim yoktur; kendi derlememiz gerekir.

Sunucu on dakikada bir bakar ve Expo'nun bildirim servisine gönderir (`src/notifications`). Saatler sunucunun `TIME_ZONE` saat dilimine göredir:

| Bildirim | Ne zaman | Kime |
|---|---|---|
| Günün bulmacası | 10.00–12.00 | Son 3 günde giriş yapmış, bugünün bulmacasını oynamamış oyuncu |
| Haftalık sonuç | Pazartesi 10.00–12.00 | Geçen hafta puanlı maç oynamış oyuncu; o gün bulmaca bildirimi yerine gider |
| Seri hatırlatması | 19.00–21.00 | En az 2 günlük serisi olup bugün ödülünü almamış oyuncu |
| Geri dönüş | 19.00–21.00 | Son girişi tam 3 ya da 7 gün önce olan oyuncu |

Aynı bildirim aynı gün bir oyuncuya bir kez gider (`notification_log`). Servisin "kayıtlı değil" dediği anahtar silinir. Metinler `messages.json` içinde, cihazın diliyle (Türkçe ya da İngilizce) yazılır. Zamanlayıcı yalnızca `NOTIFICATIONS=1` iken çalışır.

## Lider tablosu ve günün bulmacası

- **Lider tablosu.** Tüm zamanlar tablosu `ratings` tablosundan gelir (genelde puanların toplamı, oyunda o oyunun puanı). Haftalık tablo, bu haftanın pazartesi 00.00'ından (sunucunun `TIME_ZONE` saat dilimi) bu yana biten puanlı maçlardaki puan değişimlerinin toplamıdır; yalnızca o hafta puanlı maç oynayanlar görünür. Sıralama SQL `RANK()` ile; eşit puanlılar aynı sırayı alır. Satırdaki seviye her zaman toplam puandan.
- **Günün ızgarası.** Pazar ve gün adından türeyen sabit bir sayıyla (FNV-1a) orta zorluktaki ızgaralardan biri seçilir; aynı gün herkese aynı ızgara gelir, sunucu yeniden başlasa da değişmez. Gün sınırı `TIME_ZONE`'a göredir.
- **Kayıt.** Bulmacayı yalnızca açmak kayıt oluşturmaz; ilk tahminde `puzzle_plays` satırı açılır. Böylece "bugün oynayan" sayısı ve sıralama yalnızca gerçekten oynayanları içerir.
- **Puan.** Hücre puanı `puzzleCellPoints(aynı, toplam)` ile hesaplanır (`packages/protocol/src/rankings.ts`), sıralamada aynı hesap SQL ile yapılır. Ödül gol kayıt defterine `puzzle` nedeniyle, dayanak `pazar:gün` olarak yazılır; ikinci kez verilemez.

| Konum | Görevi |
|---|---|
| `server/src/progress/leaderboard.ts` | Haftalık ve tüm zamanlar tabloları |
| `server/src/progress/puzzle.ts` | Günün ızgarası, tahmin, bitiş ve ödül, günün sıralaması |
| `server/src/progress/points.ts` | Gün ve hafta sınırları (saat dilimine göre) |
| `app/src/app/leaderboard.tsx` | Lider tablosu ekranı |
| `app/src/app/puzzle.tsx` | Bulmaca ekranı: tahta, arama, bitiş özeti, paylaşma, günün sıralaması |
| `app/src/features/progress/home-tiles.tsx` | Ana ekrandaki bulmaca ve lider tablosu kutucukları |

## Uygulamada hesap

| Konum | İçerik |
|---|---|
| `src/api/` | Sunucu adresi çözümü ve istek istemcisi |
| `src/auth/session.ts` | Giriş akışının mantığı |
| `src/auth/storage.ts` | Jetonları ve tanıtım bayrağını cihazın güvenli deposunda saklar |
| `src/auth/auth-provider.tsx` | Hesap durumunu tüm ekranlara verir |
| `src/auth/entry-gate.tsx` | Her ekranı saran kapı: ekran hesap durumuna uymuyorsa doğru ekrana yönlendirir |
| `src/app/_layout.tsx` | Yazı tiplerini yükler, açılış ekranını kapatır, sağlayıcıları ve ekran yığınını kurar |
| `src/app/onboarding.tsx` | Tanıtım: üç sayfada oyunun anlatımı |
| `src/app/welcome.tsx` | Karşılama: misafir olarak devam et, giriş yap, hesap oluştur |
| `src/app/login.tsx`, `src/app/register.tsx` | Giriş ve kayıt formları |
| `src/app/account.tsx` | Hesap ekranı: kullanıcı adı, e-posta, çıkış |
| `src/components/form-screen.tsx` | Klavye açılınca odaklanan alanı görünür tutan form zemini |

Açılış akışı:

| Durum | Açılan ekran |
|---|---|
| İlk açılış | Tanıtım, ardından karşılama |
| Üye olarak giriş yapılmış | Doğrudan ana ekran |
| Yalnızca misafir hesabı var | Her açılışta karşılama |
| Üyenin oturumu sunucuda geçersiz | Karşılama |
| Üye, ama sunucuya ulaşılamıyor | Ana ekran, çevrimdışı |

- **Misafir hesabı cihazda kalır.** Cihazda iki ayrı jeton saklanır: misafir jetonu ve üye jetonu. "Misafir olarak devam et" her seferinde aynı misafir hesabını açar; yeni misafir yalnızca eski jeton artık kabul edilmiyorsa oluşur.
- **Çıkış.** Üye çıkışı sunucudaki oturumu kapatır. Misafir çıkışı yalnızca karşılama ekranına döndürür; misafir hesabı durur.
- **Ekran koruması.** Her ekran `EntryGate` ile sarılıdır. Hesap durumundan dört sonuçtan biri çıkar: yükleniyor, tanıtım, karşılama, oyun. Ekran kendi grubunda değilse kapı ekran yığınını tek adımda sıfırlar ve doğru ekranı açar; geri tuşu eski gruba dönmez. Ana ekran, maç ve hesap "oyun" grubundadır; giriş ve kayıt "karşılama" grubundadır.
- **Veritabanı sağlayıcısının altı sabit kalır.** `expo-sqlite`'ın `SQLiteProvider` bileşeni çocukları değişince yeniden çizilmez. `DatabaseProvider` altına değişen prop taşıyan bileşen konmaz; değişen bilgi context ile taşınır.
- **Tek satırlık başlık yazıları satırı doldurur.** Android, eğik başlık yazı tipini harf aralığıyla birlikte dar ölçüyor. Genişliği içeriğe göre belirlenen kutuda son kelime görünmeyen ikinci satıra düşer. Bu yazılar `flex: 1` ya da tam genişlik ve ortalı hizalama ile yerleştirilir.
- **Açılış ekranı.** Yalnızca yazı tipleri yüklenince kapanır; hesap durumunu beklemez. Hesap durumu yüklenirken ekranda dönen bir gösterge durur.
- **Hata dayanıklılığı.** Kayıtlı oturum okunamazsa uygulama tanıtım ekranından devam eder ve hatayı terminale yazar.
- **Klavye.** Form ekranı klavye yüksekliği kadar alt boşluk ekler ve odaklanan alanı yukarı kaydırır. Klavye kütüphanesi kullanılmadı, çünkü Expo Go içinde gelmiyor.
- **Sunucu adresi.** `EXPO_PUBLIC_API_URL` verilmişse o kullanılır. Verilmemişse geliştirme sırasında Expo'nun çalıştığı bilgisayarın adresi ve 4000 kapısı kendiliğinden kullanılır; ayar gerekmez.
- **Çevrimdışı.** Sunucuya ulaşılamazsa misafir girişi yine içeri alır; XOX'ta bota karşı oyun çalışmaya devam eder.
- **Ertelendi.** Google ve Apple girişinin uygulama tarafı sonraya bırakıldı. Sunucu tarafı hazır.

## Güncelleme uyarısı

Online maç, uygulamadaki veri sürümü sunucununkiyle aynı değilse açılmaz. Oyuncu bunu maç ararken değil, uygulamayı açar açmaz öğrenir.

- **Denetim.** Uygulama açılışta ve arka plandan her dönüşte `GET /v1/version` ister; sunucunun veri sürümü ya da protokol numarası uygulamadakinden yeniyse uyarı çıkar. Uygulama sunucudan yeniyse (yeni derleme sunucudan önce kurulduysa) ya da sunucuya ulaşılamıyorsa uyarı çıkmaz.
- **Ekran.** Tam ekran: "Yeni sürüm hazır", kısa açıklama, "Güncelle" ve "Şimdi değil". "Güncelle" mağaza uygulamasını açar (Android `market://details?id=com.challengegoal.app`, iOS `itms-apps://apps.apple.com/app/id6820528682`); açılamazsa mağazanın web sayfasına düşer. "Şimdi değil" ve geri tuşu uyarıyı o oturum için kapatır; mağaza, tablo ve hesap ekranları kullanılabilir kalır.
- **Maç ekranı.** Eski uygulamayla maç aranırsa çıkan hata ekranında da aynı "Güncelle" düğmesi vardır.
- **Kod.** `app/src/update/`: `requirement.ts` (karar), `store-link.ts` (mağaza adresleri), `use-update-required.ts` (denetim), `update-gate.tsx` (ekran); kök yerleşimde `UpdateGate` olarak durur.
- **Dağıtım sırası.** Sunucu yeni veriyle, yeni sürüm mağazada indirilebilir olduktan sonra dağıtılmalıdır. Önce dağıtılırsa oyuncuya "güncelle" denir ama mağazada güncelleme yoktur.
- **Kapsam.** Uyarı on ikinci derlemeden itibaren vardır; on birinci ve öncesi yalnızca maç ekranındaki hata metnini gösterir.

## Testler

| Paket | Test sayısı | Neyi denetler |
|---|---|---|
| Veri hattı | 74 | Bilinen cevaplar, söylenti kayıtları, ad dilleri, ızgara kuralları, uygulama veritabanı, ad sadeleştirme. Görsel hattı (15): lisans süzgeci, yazar adı, kırpma, profil ve kalabalık kadraj elemesi, yayınlanan kayıtların tutarlılığı. İstatistikler (9): kaynak seçimi, kariyerin tam olup olmadığı, kulüp toplamları, kulüp yıllarının uygulama veritabanında tutarlılığı. Kimlik kaydı (12): yeni oyuncunun kimliği, sıradan bağımsızlık, Wikidata ya da Transfermarkt kaydı sonradan gelince kimliğin korunması, birleşme, ayrılma, yeniden bağlanma, emekli kimliğin başkasına verilmemesi, kaybolup dönen oyuncu, dosyanın okunup yazılması, uygulamadaki her oyuncunun kayıtta olması, bir kaynağın iki oyuncuya bağlanmaması. Çizim denetimi (2) ve alternatif fotoğraf seçimi (2): iyi çizimin korunması, kusurun adlandırılması, kategori fotoğrafında soyadı şartı, dikey ve büyük fotoğrafların önce denenmesi. Pazarlar (9): dillerin eşit ağırlıkla sıralanması, okunmayan ve sıra dışı kalan oyuncular, puanların ilk pazarın dağılımına oturtulması, pazarın bilinirlik dilleri, uzun kulüp adının sadeleşmesi, yerli ligi olmayan pazarda kulüp havuzu, aylık dökümden okunma sayımı |
| Kural motoru | 69 | Maç akışı, bitiş koşulları, bot, ad sadeleştirme. Kart Düellosu (10): el kuralları, aynı anda oynama, eşitlik, bilinmeyen değer, bitiş. Kadro Kur (6): yuva yerleşimi, önce seçenin alması, tur başına tek seçim, pas, bitiş. Hangisi Yüksek (5): doğru kart, seri ve el geçişi, eşit el sayısı. Zincir (5): halka ekleme, tur kaybı, kısalan süre, bitiş. En Az Bilinen (3): tur kazananı, gizli cevap, bitiş. Açık Artırma (5): teklif sırası ve sınırları, ispat, süre dolması, en yüksek teklif, bitiş. İlk 10 (4): sıraya göre puan, can kaybı, canı biten oyuncunun atlanması, bitiş. Kariyer Yolu (4): puanın açık ipucuna göre azalması, yeni ipucu ve sıra geçişi, son tahmin hakkı, bitiş. Beraberliğin kalkması (4): eşit hücrede az hata yapanın kazanması, her şey eşitken ikinci başlayanın kazanması, üçlünün hâlâ mümkün olup olmadığı, hizalar kapanınca dolu tahtada çok hücrelinin kazanması |
| Sunucu | 272 | Görsel dosyalarının sunulması (3). Hesaplar (19): misafir, kayıt, giriş, çıkış, oturum süresi, şifre kuralları, Google jetonu doğrulama, istek sınırı. Online maç (42): maç odası kuralları, eşleştirme, aynı oyuncunun iki maça düşmemesi, bot, sıraya girmeden bot maçı, kopma ve geri dönüş, hükmen bitiş, arkadaş odası, gerçek bağlantı üzerinden baştan sona maç, sürüm ucu, maç kaydı, mesaj ayrıştırma. Kart Düellosu (20): ayrı sıralar, konseptsiz pazar, el doğrulama ve tamamlama, gizli bilgi, soru seçimi, süre dolması, puanla bitiş ve kayıt, hükmen bitiş, geri dönüş, bot; gerçek veritabanıyla bota karşı tam maç. Kadro Kur (12): kulüpsüz pazar, seçim doğrulama, dolu mevki, ara ve yeni kulüp, süre dolması, puanla bitiş ve kayıt, hükmen bitiş, bot seçimleri; gerçek veritabanıyla bota karşı tam maç. Hangisi Yüksek (11), Zincir (9), En Az Bilinen (8), Açık Artırma (9), İlk 10 (8) ve Kariyer Yolu (9): soru, ölçüt, liste ve gizli futbolcu üretimi, sıra ya da gizli cevap, teklif ve ispat, açılış, süre dolması, bitiş ve kayıt, bot; beşi için gerçek veritabanıyla bota karşı tam maç, En Az Bilinen için sunucunun bu modu kabul etmediği. Puan, seviye ve gol (19): puan ve güç puanı hesabı, seviyenin düşmemesi, herkesin aynı güçle başlaması, seviye eşikleri, gün sınırı, cüzdan ve hoş geldin hediyesi, aynı dayanağa ikinci gol yazılmaması, günlük seri, puanlı maçta puan ve gol, seviye atlama, hükmen kayıp, gizli botun güç puanı, puansız maçlar, güce yakın eşleştirme ve bekledikçe genişleyen aralık, komşu zorlukla eşleşme ve Kolay–Zor ayrımı, oyuna özel bot seviyesi ve kaydı, ilerleme özeti, uç noktalar. Jokerler (12): gol düşme ve gizli bilgi, maçta iki joker sınırı, başka modun jokeri, geçersiz anda ve yetersiz bakiyede ücretsiz ret, yeniden bağlanınca tekrar gönderme; dokuz modun jokerleri. Lider tablosu ve bulmaca (9): hafta sınırı, tüm zamanlar ve oyun tabloları, haftalık toplam, aynı gün aynı ızgara, hak düşme ve dolu hücre, nadirlik puanı ve sıralama, bitiş ödülü, uç noktalar. Satın alma (11): paketin bir kez yazılması, başka hesaba işlenmiş satın alma, misafir ve bilinmeyen ürün, App Store sorgusu ve sandbox'a geçiş, Google Play sorgusu ve erişim jetonunun yeniden kullanımı, mağazanın anahtarı reddetmesi. Ödüllü reklam (6): imzalı bildirimin bir kez yazılması, günlük sınır ve ertesi gün, başka reklam birimi, bilinmeyen oyuncu ve sahte imza, imzasız yoklama, anahtarların bir gün tutulması. Şifre sıfırlama (7): kodun postalanması ve yeni şifreyle giriş, eski oturumların kapanması, bilinmeyen adres, posta dili (Almanca dahil, bilinmeyen dilde İngilizce), yanlış, süresi dolmuş ve tükenmiş kod, gönderim sınırı, e-posta servisi isteği. Yönetim paneli (8): yalnızca anahtarla açılması, yanlış denemelerin sınırlanması, anahtar yokken bulunmaması, sayfanın saklanmaması, hesap, etkinlik, satın alma ve gol sayıları, gün değişimi, anahtar karşılaştırması, çevrimiçi sayacı. Puan koruma (2): kaybedilen puanın bir kez geri yazılması ve gol sınırına sayılmaması, maçtan uzun süre sonra reddedilmesi. Apple jetonu (8): yetki kodunun takım adına imzalı gizliyle değiştirilmesi, iptal isteği, Apple'ın reddi, eksik ayarda kapalı kalması, hesap silinince iptal, son girişin jetonunun saklanması, Apple'a ulaşılamadığında giriş ve silmenin sürmesi, anahtarsız ve kodsuz çalışma. Posta tasarımı (2): kodun düz ve tasarımlı gövdede yer alması, yerleştirilen değerlerin kaçışlanması. Hız kuralı (8): düşünme süresinin toplanması, yeniden sorulduğunda saatin sürmesi, puan üstünlüğünün korunması, eşitlikte hızlı olanın kazanması, sürelerin de eşit olduğu durum, Hangisi Yüksek'te hızlı olanın ve ikinci başlayanın kazanması, Kadro Kur'da kimse seçmediğinde de kazanan çıkması. Bot kadrosu (11): kadronun bir kez ve geçerli adlarla oluşması, bot adlarının alınamaması, maçtaki ve yeni karşılaşılan botun verilmemesi, gerçek oyuncu arttıkça küçülme, botun puan alıp gol almaması, yönetim sayılarına girmemesi, tabloda ilk üçün oyunculara kalması (3), sıradaki maçın kadrodan botla oynanıp geçmişe ve tabloya yansıması, art arda maçlarda farklı bot gelmesi |
| Uygulama | 139 | Altı çeviri dosyasının anahtar ve yer tutucu uyumu, pazarın dile göre seçilmesi, oyuncu tarafının öne alınması, bağlantı istemcisinin ilk bağlantıda erken vazgeçmesi ve hazır olmayan bağlantıyı düşürmesi, sorgular (gerçek veritabanına karşı; konsepte göre arama ve konsept adları dahil), maç oturumu, bayrak, istek istemcisi (geçmiş süzgeci, günlük ödül, ilerleme ve cüzdan istekleri dahil), giriş akışı, açılışta hangi ekranın açılacağı, sunucu hamlelerinin oturuma işlenmesi, bağlantı istemcisinin yeniden bağlanması. Kart Düellosu (8): konsept başlıkları ve büyük harf kuralı, soru ve değer biçimleri, görünümden kart listesi. Kadro Kur (5): kulübe ve boş mevkiye göre arama, kulüp adı, görünüm yardımcıları. Hangisi Yüksek, Zincir, En Az Bilinen, Açık Artırma, İlk 10 ve Kariyer Yolu (her biri 2): görünüm yardımcıları; ızgara başlığının adı (1), joker ipucunun baş harfleri. Mağaza (5): satın alma kanıtının mağazaya göre seçilmesi, gol paketi olmayan ürünün atlanması, mağaza durumları. Ödüllü reklam (5): golün yazılmasını bekleme, başarısız isteklerde sürdürme ve vazgeçme, satır durumları. Kulüp armaları (5): renkler ve desenler, koyu kenarın görünür kalması, tablonun geçerliliği, her kulübün arması olması. Bağlantı uyarısı (2), mağaza fiyatı ve satın alma anahtarı (3), puan korumanın beklenmesi (2). Sonuç açıklaması (1): bitiş nedeninin doğru metne bağlanması. Güncelleme uyarısı (5): yeni veri ya da protokolde uyarı, eşit ya da geride kalan sunucuda sessizlik, mağaza adresleri, mağaza uygulaması açılamayınca web sayfasına düşme, hiçbiri açılamayınca hata |

Uygulama sorgu testleri, gömülü veritabanını Node'un kendi SQLite modülüyle açar; yani sorgular gerçek veriye karşı çalışır.

## Bilinen eksikler

- Arayüz Android emülatöründe görülerek doğrulanıyor; iOS'ta hiç denenmedi.
- Sesler yer tutucu, bayraklar emoji.
- Büyük harfe çevirme adın diline göre yapılıyor: yerli lig kulüpleri, ülke adları ve yerli oyuncular arayüz diliyle, diğerleri dilden bağımsız kuralla. Yabancı ülke vatandaşı olup Türkçe adı olan oyuncularda ("Özil") noktalı İ çıkmaz.
- npm, onaylanmamış paketlerin kurulum betiklerini çalıştırmıyor. Skia'nın kurulum betiği bu yüzden çalışmadı. Expo Go ile sorun olmaz; ilk yerel derlemeden önce `npm approve-scripts @shopify/react-native-skia` gerekir.
- Tarihsiz Wikidata kayıtları cevap olarak kabul edildiği için hatalı kabuller olabilir (örnek: bir kulüp başkanının oyuncu olarak görünmesi).
- Wikidata'dan gelen 5 binden fazla eski İngiliz oyuncunun uyruğu İngiltere yerine Birleşik Krallık.
- Uygulama veritabanı (13 MB) depoya ikili dosya olarak giriyor; her veri güncellemesi depo geçmişini büyütür.
- Oyuncu görselleri depoda değil; yalnızca üretildiği bilgisayarda (`data/build/portraits`). Sunucu başka bir yere taşınırken bu klasör de taşınmalı ya da bir depolama servisine yüklenmeli.
- Web hedefi kurulmadı; veritabanı kütüphanesinin web desteği ek ayar ister.
- Giriş akışı emülatörde baştan sona doğrulandı; gerçek telefonda düzeltmeden sonra henüz denenmedi.
- Üye, sunucuya ulaşılamayan bir ağda uygulamayı açarsa ana ekran en çok 8 saniye gecikir; hesap bilgisi cihazda saklanmadığı için istek zaman aşımı bekleniyor.
- Misafir hesabı kalıcı hesaba dönüşmediği için misafirken oynanan maçlar üye hesabına taşınmaz.
- E-posta doğrulama yok; kayıtta yazılan adresin oyuncuya ait olduğu denetlenmiyor. Şifre sıfırlama postasının ulaştığını kullanıcı telefonda doğruladı (9 Ekim 2026); yeni tasarımlı postanın posta uygulamalarındaki görünümü henüz teyit edilmedi.
- Google ile giriş Android telefonda çalıştı (8 Ekim 2026). Apple ile giriş ve Apple jetonunun iptali gerçek cihazda denenmedi (iOS hiç denenmedi, yalnızca derlendi); iptal için Apple'ın uçları anahtarla sınandı, anahtar kabul ediliyor.
- Bildirimleri uygulama içinden tek tek kapatma ayarı yok; yalnızca sistem izni var.
- Güncelleme uyarısı gerçek telefonda ve iOS'ta denenmedi; iOS mağaza bağlantısı uygulama App Store'da yayımlanana kadar sınanamaz.
- Almanca, İspanyolca, Fransızca ve İtalyanca çeviriler ana dili konuşan biri tarafından okunmadı. Uygulama emülatörde yalnızca Almanca ve İtalyanca açılıp karşılama, ana ekran, günün bulmacası ve arama görüldü; diğer ekranlar ve diğer iki dil görülmedi.
- Uluslararası pazarda bilinirlik sıralamasının başında futbolcu olmayan iki ünlü var (Jason Statham, Julio Iglesias). Wikidata'da kulüp kaydı taşıdıkları için veriye giriyorlar; doğrulanmış kulüpleri olmadığından ızgara cevabı olmazlar ama aramada çıkarlar. Aynı kayıtlar Türkiye pazarında da vardı.
- Uluslararası pazarın bot adları ortak ad listesinden gelir; dile göre ayrışmaz.
- Destek adresi Türkçe ve İngilizce okunuyor; site bunu her dilde söyler.
- Gol satın alma Google Play'de deneme kartıyla uçtan uca çalıştı (8 Ekim 2026: satın alma, sunucu doğrulaması, 30 gol). App Store tarafı iOS derlemesi bir iPhone'a kurulunca denenecek.
- Ödüllü reklam, AdMob'da deneme cihazı olarak eklenen telefonda uçtan uca çalıştı (8 Ekim 2026: reklam, sunucu bildirimi, 2 gol). Gerçek reklam, uygulama mağazada yayımlanana kadar gelmez (`no-fill`). Avrupa rıza mesajına ChallengeGoal uygulamalarının eklenip yayımlanması ve iOS için IDFA açıklama mesajı kullanıcıda bekliyor.
- İade edilen satın almanın golü geri alınmıyor; mağazaların iade bildirimleri dinlenmiyor.
- Armalar, yalnızca baş portrelerin kart yerleşimi, bağlantı uyarısı, futbolcu aramada klavyenin açılması ve uyarı metinleri emülatörde (Expo Go) doğrulandı (8 Ekim 2026); gerçek telefonda sonraki derlemeyle görülecek. Puan koruma düğmesi ve şifremi unuttum ekranı hiçbir cihazda denenmedi; zincir düğümleri ve kadro yuvalarındaki yeni portre yerleşimi de görülmedi.
- Canlı sunucunun yedekleri aynı sunucuda duruyor; sunucu dışına kopya alınmıyor.
- İstek sınırı bellekte tutuluyor; sunucu yeniden başlayınca sıfırlanır ve birden fazla sunucuda paylaşılmaz.
- Maçlar ve eşleştirme sırası da bellekte; sunucu yeniden başlarsa süren maçlar kaybolur ve tek sunucudan fazlası çalıştırılamaz.
- Online maç iki gerçek telefonla henüz denenmedi; emülatör ile betikle bağlanan ikinci oyuncu arasında baştan sona oynandı.
- Bot, rakibe bot olduğunu söylemiyor. Bu bilinçli bir ürün kararı; mağaza kuralları ya da kullanıcı tepkisi gerektirirse kullanım koşullarında belirtilmeli.
- Bot ayarları (isabet, bilgi oranı, gecikme) henüz insan verisiyle doğrulanmadı; hedef kazanma oranları (Kolay %65, Orta %50, Zor %35) betada `matches.bot_level` ve sonuçlardan ölçülüp ayarlanacak. Bot seviyesi oyuncunun güç puanına değil son bot maçlarına bakıyor.
- Lider tablosu ve bulmaca sıralaması her istekte baştan hesaplanıyor; oyuncu sayısı büyüdüğünde önbellek ya da özet tablo gerekir.
- Uygulama arka plana alınınca bağlantı kopar; 30 saniyeden uzun kalınırsa maç hükmen kaybedilir.
- Sunucu şifresiz HTTP ile çalışıyor; yayında önüne TLS sonlandıran bir katman gerekir.
- Kart Düellosu yalnızca online; bota karşı internetsiz oynanamıyor. Turnuva konseptleri ("Dünya Kupası'nda oynamış") veri olmadığı için yok.
- Düelloda Vikiveri kaynaklı oyuncuların sayıları yalnızca lig maçlarını kapsıyor; diğerleri bütün resmî maçları. Aynı soruda karşılaşabiliyorlar.
- Kadro Kur'da asist verisi olmayan futbolcular seçilemiyor; bu, eski yıldızların bir kısmını dışarıda bırakıyor.
- Zincir'de yalnızca veritabanındaki kulüpler (Süper Lig ve beş büyük lig) bağlantı sayılıyor; gerçekte başka bir kulüpte birlikte oynamış iki futbolcu yanlış sayılır.
- Millî maç sayısı 2012 öncesi kariyerler için yok; bu yüzden İlk 10'da millî maç listesi kullanılmıyor, Kart Düellosu ve Hangisi Yüksek'te millî maç sorusu yalnızca iki kartta da değer varsa çıkıyor.
- İlk 10'un gol listeleri iki kaynağı karıştırıyor (Vikiveri kaynaklı eski oyuncularda yalnızca lig golleri); ekranda "sıralama uygulamanın verisine göredir" notu var.
- Kariyer Yolu'nda yalnızca veritabanındaki kulüpler var; bir kulüpteki birden fazla dönem tek kayıt olarak tutulduğu için araya giren kiralıklar ("Galatasaray 1992–2008" içinde "Torino 1995") sırayı bozuk gösterebilir.
- Yeni modlarda internetsiz oyun yok; hepsi sunucu gerektiriyor.
- Geliştirme ortamında sıcak yenileme ikinci bir bağlantı açıp maçı "başka cihaz" hatasıyla düşürebiliyor.
- Görsel üretimi yüzü her zaman korumuyor: Messi'nin çizimi kaynak fotoğraftaki yüze yeterince benzemiyor; Arda Güler'in çizimi bambaşka birine (ten rengi ve yüz hatları değişmiş), Arthur'unki daha koyu tene dönmüş. Kaynak fotoğraf ve kırpma doğru; sapma çizime dönüştürme adımında. Kaynak yüz ile çizim arasında otomatik kimlik karşılaştırması (yüz gömme benzerliği) yapılıp eşiğin altındakiler yeniden üretilmeli ya da çıkarılmalı.
- Kart Düellosu'nda iki oyuncunun elinde aynı futbolcu olabiliyor (eller gizli ve aynı anda seçildiği için); aynı kart karşılaşırsa tur berabere biter. Bu bilinçli olarak böyle bırakıldı.
- Bulmaca ekranındaki "Yeni bulmaca yarın 00.00'da" sunucunun saat dilimine (İstanbul) göre; başka saat dilimindeki oyuncuya yanlış saat söyler.
- İnternetsiz XOX bot maçları sunucuya yazılmadığı için geçmiş ekranında ve istatistiklerde görünmüyor.
- Geliştirmede sıcak yenileme, veritabanı sağlayıcısı yeniden bağlanırken Expo Go'yu yerel bir expo-sqlite çökmesiyle kapatabiliyor (`sqlite3_finalize` sırasında çift serbest bırakma). Yalnızca geliştirmede; uygulamayı yeniden açmak yeterli.
