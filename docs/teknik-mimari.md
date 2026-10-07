# Teknik Mimari

Son güncelleme: 7 Ekim 2026

## Depo yapısı

```
SportApps/
├── app/                  Expo uygulaması (React Native, TypeScript)
│   ├── assets/data/      Uygulamaya gömülen veritabanı ve sürüm dosyası
│   ├── assets/sounds/    Efekt sesleri
│   └── src/
│       ├── app/          Ekranlar (Expo Router): ana ekran, maç ekranı
│       ├── components/   Ortak arayüz bileşenleri
│       ├── constants/    Tema: renkler, boşluklar
│       ├── data/         Veritabanı sağlayıcısı ve sorgular
│       ├── feedback/     Dokunsal geri bildirim ve ses
│       ├── features/     Özellik kodları (şimdilik yalnızca maç)
│       ├── hooks/        Tema kancaları
│       └── i18n/         Çok dilli altyapı ve çeviri dosyaları
├── server/               Sunucu (Node.js, Fastify, SQLite)
│   ├── src/accounts/     Hesaplar: şifre, oturum, kimlik doğrulama, veri erişimi
│   ├── src/http/         Uç noktalar, hata biçimi, istek sınırlama
│   ├── tests/            Sunucu testleri
│   └── data/             Sunucu veritabanı (depoya girmez)
├── packages/
│   ├── protocol/         Uygulama ile sunucu arasındaki ortak tipler ve doğrulama kuralları
│   └── game-core/        Uygulama ve sunucunun ortak kural motoru
├── data/                 Veri hattı (Python)
│   ├── pipeline/         Hattın kodu
│   ├── overrides/        Elle düzeltme tabloları
│   ├── tests/            Veri testleri
│   ├── build/            Üretilen veritabanı ve rapor (depoya girmez)
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
| Wikipedia | Oyuncu maddelerinin son 60 günlük okunma sayısı | MediaWiki Action API, istek başına 50 başlık |

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
| Oyuncu kimliği | Wikidata kaydı varsa onun numarası, yoksa 1.000.000.000 + Transfermarkt numarası |

### Elle düzeltme tabloları

`data/overrides/` altındaki dosyalar otomatik eşleştirmenin çözemediği yerleri düzeltir.

| Dosya | İşlevi |
|---|---|
| `leagues.csv` | Kapsamdaki ligler |
| `markets.csv` | Pazarlar: kod, dil, yerli lig |
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

## Kural motoru

Konum: `packages/game-core`. Saf TypeScript; ağ, veritabanı ya da arayüz bilmez. Aynı kod hem uygulamada hem sunucuda çalışacak.

| Parça | İşlevi |
|---|---|
| `createMatch` | Boş bir maç başlatır |
| `submitAnswer` | Bir cevabı işler: hücre alındı, yanlış ya da zaten kullanılmış |
| `skipTurn` | Sırayı boş geçirir (süre doldu, bot cevap veremedi) |
| `forfeit` | Bir tarafın çekilmesiyle maçı bitirir |
| `completesLine`, `countCells`, `emptyCells`, `usedFootballerIds`, `headersAt` | Yardımcılar |
| `chooseBotMove` | Botun hamlesini seçer |
| `normalizeName`, `nameTokens` | Adları aramaya uygun sade biçime çevirir |

Maç kuralları:

- Hamle süresi 20 saniye.
- Yanlış cevap, kullanılmış futbolcu ya da süre dolması sırayı rakibe geçirir.
- Aynı hizada üç hücreyi alan kazanır.
- Izgara dolar ve üçlü olmazsa daha çok hücre alan kazanır; eşitse beraberlik.
- Art arda dört turda hücre alınamazsa oyun biter ve hücre sayısına bakılır.

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
| `src/app/index.tsx` | Ana ekran: zorluk seçimi, bota karşı ve aynı cihazda iki kişi |
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

## Sunucu

Konum: `server`. Node.js 24, Fastify, SQLite (Node'un kendi `node:sqlite` modülü). TypeScript dosyaları `tsx` ile doğrudan çalışır; derleme adımı yoktur.

### Ayarlar

Ortam değişkenleriyle verilir; hepsinin varsayılanı vardır.

| Değişken | Varsayılan | Anlamı |
|---|---|---|
| `HOST` | `0.0.0.0` | Dinlenen adres. Varsayılan, aynı ağdaki telefonun bağlanmasına izin verir |
| `PORT` | `4000` | Kapı |
| `DATABASE_PATH` | `server/data/sportapps.sqlite` | Sunucu veritabanı dosyası |
| `SESSION_DAYS` | `90` | Oturum ömrü |
| `GOOGLE_CLIENT_IDS` | boş | Kabul edilen Google istemci kimlikleri, virgülle ayrılır |
| `APPLE_CLIENT_IDS` | boş | Kabul edilen Apple uygulama kimlikleri, virgülle ayrılır |

Google ya da Apple kimliği verilmemişse o giriş yöntemi kapalıdır ve "kullanılamıyor" cevabı döner.

### Uç noktalar

Hepsi `/v1` altındadır ve JSON konuşur. Oturum, `Authorization: Bearer <jeton>` başlığıyla taşınır.

| Yöntem ve yol | İşlevi |
|---|---|
| `GET /health` | Sunucu ayakta mı |
| `POST /auth/guest` | Misafir hesap ve oturum açar |
| `POST /auth/register` | E-posta, şifre ve kullanıcı adıyla yeni hesap açar |
| `POST /auth/login` | E-posta ve şifreyle giriş |
| `POST /auth/google`, `POST /auth/apple` | Sağlayıcının verdiği kimlik jetonuyla giriş |
| `POST /auth/logout` | Oturumu kapatır |
| `GET /me` | Oturumdaki hesabı döndürür |

Giriş ve kayıt uçları, geçerli bir oturumla gelen isteği "zaten giriş yapılmış" hatasıyla reddeder; önce çıkış yapılmalıdır. Kullanıcı adını değiştiren bir uç yoktur.

Hata cevabı hep aynı biçimdedir: `{ "error": { "code": "..." } }`. Kodların tam listesi `packages/protocol` içindedir; uygulama her kodu kendi dilindeki mesaja çevirir.

### Sunucu veritabanı

| Tablo | İçerik |
|---|---|
| `users` | Kimlik, kullanıcı adı, benzersizlik anahtarı, misafir mi |
| `credentials` | E-posta ve şifre özeti |
| `identities` | Google ve Apple kimlikleri |
| `sessions` | Oturum jetonunun özeti, son kullanım ve bitiş zamanı |
| `schema_migrations` | Uygulanmış şema sürümleri |

Şema değişiklikleri `server/src/database.ts` içindeki sıralı listeye eklenir; sunucu açılırken eksik olanları uygular.

### Hesap kuralları

- **Misafir.** Oyuncu "misafir olarak devam et" dediğinde açılır. Kullanıcı adı `guest` ve altı rakamdır. Misafir hesabı cihaza bağlıdır ve kalıcı hesaba dönüşmez.
- **Ayrı hesaplar.** Misafir ile üye hesabı birbirinden bağımsızdır. Misafirken hesap açılamaz ve giriş yapılamaz; önce çıkış yapılır.
- **Kullanıcı adı.** 3–16 karakter; harf, rakam ve alt çizgi. Kayıtta seçilir ve sonradan değiştirilemez. Benzersizlik büyük-küçük harf ve aksan farkı gözetmez: "Çağrı_10" varken "cagri10" alınamaz.
- **Şifre.** En az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam. scrypt ile özetlenir, düz hâli hiçbir yerde saklanmaz. Kurallar `packages/protocol` içindedir; uygulama ve sunucu aynı denetimi kullanır.
- **Oturum.** Rastgele 256 bitlik jeton; veritabanında yalnızca özeti durur. Kullanıldıkça ömrü uzar.
- **Yanlış giriş.** Bilinmeyen e-posta ile yanlış şifre aynı cevabı ve aynı süreyi verir; hangi e-postaların kayıtlı olduğu anlaşılmaz.
- **İstek sınırı.** Giriş ve kayıt uçları adres başına dakikada 30 istekle sınırlıdır.
- **Google ve Apple.** Sunucu, sağlayıcının imzaladığı jetonu sağlayıcının açık anahtarlarıyla doğrular ve yalnızca bizim istemci kimliklerimize kesilmiş jetonları kabul eder.

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
- **Çevrimdışı.** Sunucuya ulaşılamazsa misafir girişi yine içeri alır; bota karşı ve iki kişilik oyun çalışmaya devam eder.
- **Ertelendi.** Google ve Apple girişinin uygulama tarafı sonraya bırakıldı. Sunucu tarafı hazır.

## Testler

| Paket | Test sayısı | Neyi denetler |
|---|---|---|
| Veri hattı | 23 | Bilinen cevaplar, söylenti kayıtları, ad dilleri, ızgara kuralları, uygulama veritabanı, ad sadeleştirme |
| Kural motoru | 24 | Maç akışı, bitiş koşulları, bot, ad sadeleştirme |
| Sunucu | 19 | Misafir, kayıt, giriş, çıkış, oturum süresi, şifre kuralları, oturum açıkken girişin reddi, Google jetonu doğrulama, istek sınırı |
| Uygulama | 44 | Çeviri dosyalarının uyumu, sorgular (gerçek veritabanına karşı), maç oturumu, bayrak, istek istemcisi, giriş akışı, açılışta hangi ekranın açılacağı |

Uygulama sorgu testleri, gömülü veritabanını Node'un kendi SQLite modülüyle açar; yani sorgular gerçek veriye karşı çalışır.

## Bilinen eksikler

- Arayüz Android emülatöründe görülerek doğrulanıyor; iOS'ta hiç denenmedi.
- Sesler yer tutucu, bayraklar emoji.
- Türkçe arayüzde yabancı kulüp ve oyuncu adları da Türkçe kuralla büyük harfe çevriliyor ("MANCHESTER CİTY"). Adın diline göre büyütme henüz yok.
- npm, onaylanmamış paketlerin kurulum betiklerini çalıştırmıyor. Skia'nın kurulum betiği bu yüzden çalışmadı. Expo Go ile sorun olmaz; ilk yerel derlemeden önce `npm approve-scripts @shopify/react-native-skia` gerekir.
- Oyuncu kimlikleri kaynak kimliklerinden türetiliyor; yayından önce kalıcı bir kimlik kaydına geçilmeli.
- Tarihsiz Wikidata kayıtları cevap olarak kabul edildiği için hatalı kabuller olabilir (örnek: bir kulüp başkanının oyuncu olarak görünmesi).
- Wikidata'dan gelen 5 binden fazla eski İngiliz oyuncunun uyruğu İngiltere yerine Birleşik Krallık.
- Uygulama veritabanı (13 MB) depoya ikili dosya olarak giriyor; her veri güncellemesi depo geçmişini büyütür.
- Web hedefi kurulmadı; veritabanı kütüphanesinin web desteği ek ayar ister.
- Giriş akışı emülatörde baştan sona doğrulandı; gerçek telefonda düzeltmeden sonra henüz denenmedi.
- Üye, sunucuya ulaşılamayan bir ağda uygulamayı açarsa ana ekran en çok 8 saniye gecikir; hesap bilgisi cihazda saklanmadığı için istek zaman aşımı bekleniyor.
- Misafir hesabı kalıcı hesaba dönüşmediği için misafirken oynanan maçlar üye hesabına taşınmaz.
- Şifre sıfırlama ve e-posta doğrulama yok; e-posta gönderen bir servis gerektiriyor.
- Hesap silme yok; mağazalar hesap açılan uygulamalarda bunu şart koşuyor.
- İstek sınırı bellekte tutuluyor; sunucu yeniden başlayınca sıfırlanır ve birden fazla sunucuda paylaşılmaz.
- Sunucu şifresiz HTTP ile çalışıyor; yayında önüne TLS sonlandıran bir katman gerekir.
