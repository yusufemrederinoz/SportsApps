# İş Planı

Son güncelleme: 7 Ekim 2026

Adımlar bağımlılık sırasına göre dizilmiştir. Süre tahmini yoktur; Adım 0'daki kararlar kapandıktan sonra eklenir. Kararların gerekçesi [proje-yonelimi.md](proje-yonelimi.md) içindedir.

Sıra: 0 → 1 → 2 → 4 → 4B → 5 → 6 → 8 → 9 → 10. Adım 3, Adım 2 ile aynı anda yürüyebilir. Adım 7, Adım 3 bittikten sonra herhangi bir zamanda yapılabilir.

## Adım 0 — Açık kararları kapat

- Kapananlar (6 Ekim 2026): veri kaynağı, sunucu altyapısı, görsel dönüştürme için donanım, lig kapsamı.
- Yönelim belgesinde kalan açık kararlar, ilgili adım başlamadan önce kapatılır: maç kuralları Adım 4'ten, sunucu barındırma ve bot gösterimi Adım 5'ten, yedek kart Adım 7'den, gelir modeli Adım 8'den önce.

Bitti sayılır: Yönelim belgesinde "Açık kararlar" bölümü boşalır.

## Adım 1 — Depo ve veri hattı

Durum: tamamlandı (6 Ekim 2026). Veritabanında 72.435 oyuncu, 219 kulüp ve 139.771 oyuncu-kulüp kaydı var.

Çalıştırma: `data` klasöründe `python -m pipeline build`, ardından `python -m unittest discover -s tests -t .`. Veritabanı ve kalite raporu `data/build/` altına yazılır; bu klasör depoya girmez.

Açık kalanlar:

- Oyuncu kimlikleri kaynak kimliklerinden türetiliyor. Yayından önce kalıcı bir kimlik kaydına geçilmeli; yoksa bir oyuncunun kimliği sonradan değişebilir.
- Wikidata'dan gelen 5 binden fazla eski İngiliz oyuncunun uyruğu İngiltere yerine Birleşik Krallık.
- Wikidata sorguları QLever aynasına bağlı; ayna kapanırsa resmî sorgu servisine dönülmeli.

İşler:

- Git deposu kurulur. Klasörler: `data/` (veri hattı, Python), `app/` (Expo), `server/`, `docs/`.
- transfermarkt-datasets tabloları indirilir: oyuncular, transferler, kulüpler, maç kayıtları.
- Wikidata'dan futbolcular, takım kayıtları, uyruk, mevki ve doğum tarihi çekilir.
- Oyuncular ve kulüpler, Wikidata'da kayıtlı Transfermarkt kimlikleriyle birleştirilir; kimliği olmayan oyuncular doğum tarihi ve isimle eşleştirilir.
- Temizlik kuralları uygulanır: çok branşlı kulüp kayıtları, tarihî uyruklar, altyapı ve B takımları, kiralık dönemler.
- Türkçe karakterlerden bağımsız isim arama dizini üretilir ("Calhanoglu" yazan "Çalhanoğlu"nu bulur).
- Çıktı tek bir SQLite dosyasıdır; yanında bir kalite raporu üretilir.

Bitti sayılır: Süper Lig ve beş büyük lig için veritabanı üretilir. Bilinen cevaplar testi geçer (örnek: dört büyüklerin dördünde de oynayanlar Sergen Yalçın ve Burak Yılmaz çıkar).

## Adım 2 — Bilinirlik puanı ve ızgara üretici

Durum: tamamlandı (7 Ekim 2026). Türkiye pazarı için üç zorluk seviyesinde 1.500'er, toplam 4.500 ızgara üretildi; 18 veri testi geçiyor.

Sonuçlar:

- Bilinirlik puanının %65'i yerel ilgiden (pazarın dilindeki Vikipedi'de son 60 günlük okunma), %35'i dünya çapı bilinirlikten (Vikipedi dil sayısı, en yüksek piyasa değeri, millî maç sayısı) gelir.
- Kolay seviye: puanı 50 ve üzeri oyuncular; 4 yerli kulüp, 20 yabancı kulüp, 10 ülke.
- Orta seviye: puanı 42 ve üzeri; 12 yerli kulüp, 45 yabancı kulüp, 14 ülke.
- Zor seviye: puanı 32 ve üzeri; 30 yerli kulüp, 130 yabancı kulüp, 30 ülke.
- Her hücrede en az üç tanınmış cevap vardır. Bir başlık, bir seviyedeki ızgaraların en çok %30'unda yer alır.
- Wikidata'daki doğrulanmamış güncel yıl kayıtları (söylenti transferleri) veritabanına alınmaz. Tarihsiz kayıtlar cevap olarak kabul edilir ama ızgara kurarken sayılmaz.
- Şema dil ve pazar bağımsızdır: kulüp ve ülke adları dil sütunlu tablolarda, bilinirlik ve ızgaralar pazar bazında tutulur.

İşler:

- Her oyuncuya bir bilinirlik puanı verilir (yerel Vikipedi okunma sayısı, Vikipedi dil sayısı, en yüksek piyasa değeri, millî maç sayısı).
- Izgara başlık türleri tanımlanır: önce kulüp ve uyruk; sonra teknik direktör, kupa, takım arkadaşı.
- Geçerlilik kuralı: her hücrede en az üç tanınmış cevap.
- Üç zorluk seviyesinde geçerli ızgaralar önceden hesaplanıp tabloya yazılır.

Bitti sayılır: Her zorluk seviyesinde en az 1.000 geçerli ızgara vardır (önerilen hedef).

## Adım 3 — Görsel hattı pilotu

- 20–30 oyuncu için Commons fotoğrafı ile yazar ve lisans bilgisi çekilir.
- Yüz kırpılır; yerel ekran kartında çalışan yapay zekâ ile klasik filtre yan yana denenir.
- Yöntem; benzerlik, tutarlılık ve görsel başına maliyete göre seçilir.
- Fotoğrafı olmayanlar için yedek kart tasarlanır.

Bitti sayılır: Tarz ve araç seçilir, görsel başına maliyet bilinir.

## Adım 4 — Uygulama iskeleti ve offline XOX

Durum: tamamlandı (7 Ekim 2026). Uygulama telefonda denendi, hata görülmedi.

Yapılanlar:

- Expo projesi (SDK 57) ve çok dilli altyapı (Türkçe, İngilizce).
- Uygulama ve sunucunun ortak kullanacağı kural motoru ve bot (24 test).
- Uygulamaya gömülen 13 MB'lık veritabanı ve ad araması.
- Ana ekran ve maç ekranı: zorluk seçimi, bota karşı, aynı cihazda iki kişi, 20 saniyelik sayaç, sonuç.
- 22 uygulama testi, tip denetimi, lint ve Android paketleme geçiyor.


Çalıştırma: depo kökünde `npm install`, ardından `app` klasöründe `npx expo start`. Testler için kökte `npm test`.

- Expo projesi kurulur (TypeScript). Kart ve ızgara bileşenleri tasarlanır.
- SQLite dosyası uygulamaya gömülür.
- Oyuncu arama ve otomatik tamamlama yazılır.
- XOX kural motoru, sunucuda da kullanılabilecek ayrı bir modül olarak yazılır.
- Offline modlar: bota karşı ve aynı telefonda iki kişi.

Bitti sayılır: Android ve iOS'ta internetsiz bir maç baştan sona oynanır.

## Adım 4B — Tasarım dili ve oyun hissi

Durum: ikinci sürüm yazıldı, ekran görüntüsüyle inceleme bekliyor (7 Ekim 2026). Kurallar [tasarim-dili.md](tasarim-dili.md) içinde.

Birinci sürüm yetersiz bulundu: oyun gibi değil, animasyonlar zayıf, ızgara çekici değil, renk ve yazı oturmamış. Hedef çıta EA FC Ultimate Team olarak belirlendi ve arayüz baştan tasarlandı.

İkinci sürümde yapılanlar:

- Alınan hücre metalik oyuncu kartına dönüşüyor: mevki, bayrak, ad, taraf kaplaması.
- Izgara zemini tek Skia tuvalinde çiziliyor; sıra oyuncudayken boş yuvalar nabız gibi atıyor.
- Kart gelişi, kıvılcım, yanlışta sarsılma, damga geri bildirimi, kazanan üçlünün vurgusu eklendi.
- Sonuç artık ekranı kaplayan bir perde: dönen ışık hüzmeleri, çarpan başlık, konfeti.
- Ana ekran metalik mod kartlarıyla, arama penceresi mevki rozetli satırlarla yeniden yapıldı.

Kalanlar:

- Ekran görüntüleriyle inceleme ve buna göre boyut, renk, hız ayarı.
- Kartın ortasına oyuncu görseli (Adım 3).
- Gerçek ses tasarımı, vektör bayraklar, ikon seti, ses ve titreşim ayarı.
- Oyuncu kartı bileşeni (Adım 3'teki görsellerle birlikte).

- Seçilen görsel yön için renk, tipografi, boşluk ve bileşen kuralları yazılır.
- Skia, Lottie, expo-haptics ve expo-audio projeye eklenir.
- Izgara, hücre alma, sıra geçişi, sayaç ve sonuç ekranı hareket, ses ve dokunsal geri bildirimle yeniden yapılır.
- Oyuncu kartı bileşeni tasarlanır; Adım 3'teki görsellerle birlikte çalışacak şekilde.

Bitti sayılır: Bir maç, baştan sona seçilen görsel dille, animasyon ve sesle oynanır; ekranlar iskelet görünümünden çıkar.

## Adım 5 — Online altyapı ve bot

- Sunucu Node.js ve WebSocket ile yazılır; barındırma ve veritabanı seçilir.
- Kimlik: misafir girişi, Google ve Apple ile giriş.
- Eşleştirme kuyruğu ve oda koduyla arkadaş daveti.
- Sunucuda maç durumu, cevap doğrulama, hamle süresi, kopan bağlantıya geri dönüş.
- Bekleme süresi dolunca bot devreye girer; bot zorluğu oyuncunun seviyesine göre ayarlanır.

Bitti sayılır: İki gerçek cihaz bir maçı tamamlar. Bağlantı kopması, süre dolması, beraberlik ve aynı anda iki eşleşme senaryoları testle doğrulanır.

## Adım 6 — Sıralama ve günlük bulmaca

- Sıralama puanı ve lider tablosu.
- Herkesin aynı ızgarayı çözdüğü günlük bulmaca.
- Maç geçmişi ve temel istatistikler.

Bitti sayılır: Bir maçın sonucu puana ve lider tablosuna yansır; günlük bulmaca her gün kendiliğinden değişir.

## Adım 7 — Görsellerin toplu üretimi ve kart koleksiyonu

- Seçilen yöntemle fotoğrafı olan oyuncuların kartları üretilir; önce en tanınmışlar.
- En tanınmış oyuncuların kartları elle gözden geçirilir.
- Görseller bir depolama servisinden sunulur, cihazda önbelleğe alınır.
- "Görsel kaynakları" ekranı yazar ve lisans verisinden otomatik oluşturulur.

Bitti sayılır: Tanınmış oyuncuların kartları uygulamada görünür; atıf ekranı eksiksizdir.

## Adım 8 — Gelir modeli ve mağaza hazırlığı

- Reklam ve uygulama içi satın alma eklenir.
- Gizlilik politikası ve KVKK metni hazırlanır.
- Mağaza sayfaları, ekran görüntüleri ve Türkçe açıklamalar hazırlanır.
- Geliştirici hesapları açılır: Apple yıllık 99 dolar, Google Play tek seferlik 25 dolar.

Bitti sayılır: İki mağazada da test sürümü yüklenebilir durumdadır.

## Adım 9 — Kapalı beta ve yayın

- Android'de kapalı test, iOS'ta TestFlight ile sınırlı bir grupla denenir.
- Google'ın yeni kişisel hesaplar için kapalı test şartı (bildiğimiz kadarıyla 12 test kullanıcısı, 14 gün) başvurudan önce doğrulanır.
- Çökme, eşleşme ve veri hataları düzeltilir.

Bitti sayılır: Uygulama iki mağazada yayındadır.

## Adım 10 — Yayın sonrası

- Veri hattı haftalık çalışır; yeni veritabanı uygulamaya güncelleme olarak iner.
- İkinci oyun modu eklenir. İlk aday: "iki takım, bir oyuncu".
- Yorumlar ve eşleşme süreleri izlenir.
