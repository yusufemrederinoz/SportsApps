# İş Planı

Son güncelleme: 6 Ekim 2026

Adımlar bağımlılık sırasına göre dizilmiştir. Süre tahmini yoktur; Adım 0'daki kararlar kapandıktan sonra eklenir. Kararların gerekçesi [proje-yonelimi.md](proje-yonelimi.md) içindedir.

Sıra: 0 → 1 → 2 → 4 → 5 → 6 → 8 → 9 → 10. Adım 3, Adım 2 ile aynı anda yürüyebilir. Adım 7, Adım 3 bittikten sonra herhangi bir zamanda yapılabilir.

## Adım 0 — Açık kararları kapat

- Kapananlar (6 Ekim 2026): veri kaynağı, sunucu altyapısı, görsel dönüştürme için donanım, lig kapsamı.
- Yönelim belgesinde kalan açık kararlar, ilgili adım başlamadan önce kapatılır: maç kuralları Adım 4'ten, sunucu barındırma ve bot gösterimi Adım 5'ten, yedek kart Adım 7'den, gelir modeli Adım 8'den önce.

Bitti sayılır: Yönelim belgesinde "Açık kararlar" bölümü boşalır.

## Adım 1 — Depo ve veri hattı

Durum: tamamlandı (6 Ekim 2026). Veritabanında 73.065 oyuncu, 219 kulüp ve 140.805 oyuncu-kulüp kaydı var; yedi bilinen cevap testi geçiyor.

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

Durum: sürüyor (7 Ekim 2026). Bilinirlik puanı ve ızgara üreticinin kodu yazıldı; Türkçe Vikipedi okunma sayıları çekiliyor. Kalanlar: şemayı dil ve pazar boyutlu hâle getirmek, eşikleri ayarlamak, ızgaraları üretmek.

- Her oyuncuya bir bilinirlik puanı verilir (Vikipedi dil sayısı, en yüksek piyasa değeri, millî maç sayısı).
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

Durum: başladı (7 Ekim 2026). Expo projesi (SDK 57), uygulama ve sunucunun ortak kullanacağı kural motoru (13 test) ve çok dilli altyapı (Türkçe, İngilizce) hazır. Kalanlar: veritabanını gömmek, oyuncu arama, ızgara ekranı, offline modlar.

Çalıştırma: depo kökünde `npm install`, ardından `app` klasöründe `npx expo start`. Testler için kökte `npm test`.

- Expo projesi kurulur (TypeScript). Kart ve ızgara bileşenleri tasarlanır.
- SQLite dosyası uygulamaya gömülür.
- Oyuncu arama ve otomatik tamamlama yazılır.
- XOX kural motoru, sunucuda da kullanılabilecek ayrı bir modül olarak yazılır.
- Offline modlar: bota karşı ve aynı telefonda iki kişi.

Bitti sayılır: Android ve iOS'ta internetsiz bir maç baştan sona oynanır.

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
