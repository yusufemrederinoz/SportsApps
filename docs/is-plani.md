# İş Planı

Son güncelleme: 7 Ekim 2026

Adımlar bağımlılık sırasına göre dizilmiştir. Süre tahmini yoktur; Adım 0'daki kararlar kapandıktan sonra eklenir. Kararların gerekçesi [proje-yonelimi.md](proje-yonelimi.md) içindedir.

Sıra: 0 → 1 → 2 → 4 → 4B → 5 → 3 → 7 → 7B → 6 → 8 → 9 → 10. Adım 3 ve 7, Adım 5'in ardından yapıldı. Adım 7B (yeni oyun modları) kullanıcının isteğiyle yayından önceye alındı.

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

Durum: tamamlandı (7 Ekim 2026).

- Commons fotoğrafı ile yazar ve lisans bilgisi çekildi; yalnızca değiştirilmiş kopyaya izin veren lisanslar alındı.
- Yüz bulunup baş ve omuzlar kırpıldı.
- Yerel ekran kartında çalışan model ile klasik filtre yan yana denendi. Model seçildi: klasik filtre logoları ve arka planı koruyor.
- Görsel başına maliyet: RTX 5080'de yaklaşık 8 saniye; para ödenen bir servis yok.
- Yedek kart: görseli olmayan oyuncuda kart, görselsiz mevcut tasarımıyla görünür.

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

Durum: tamamlandı (7 Ekim 2026). İkinci sürüm incelendi ve "bu şekilde kalabilir" denerek kabul edildi. Kurallar [tasarim-dili.md](tasarim-dili.md) içinde.

Birinci sürüm yetersiz bulundu: oyun gibi değil, animasyonlar zayıf, ızgara çekici değil, renk ve yazı oturmamış. Hedef çıta EA FC Ultimate Team olarak belirlendi ve arayüz baştan tasarlandı.

İkinci sürümde yapılanlar:

- Alınan hücre metalik oyuncu kartına dönüşüyor: mevki, bayrak, ad, taraf kaplaması.
- Izgara zemini tek Skia tuvalinde çiziliyor; sıra oyuncudayken boş yuvalar nabız gibi atıyor.
- Kart gelişi, kıvılcım, yanlışta sarsılma, damga geri bildirimi, kazanan üçlünün vurgusu eklendi.
- Sonuç artık ekranı kaplayan bir perde: dönen ışık hüzmeleri, çarpan başlık, konfeti.
- Ana ekran metalik mod kartlarıyla, arama penceresi mevki rozetli satırlarla yeniden yapıldı.

Sonraya kalanlar:

- Kartın ortasına oyuncu görseli (Adım 3).
- Gerçek ses tasarımı, vektör bayraklar, ikon seti, ses ve titreşim ayarı.

## Adım 5 — Online altyapı ve bot

Durum: sürüyor. Dört dilime ayrıldı; hesaplar, online maç ve arkadaş daveti tamamlandı, barındırma kaldı.

### 5A — Hesaplar

Durum: tamamlandı (7 Ekim 2026). Açılışta takılmanın kök nedeni bulundu ve giderildi; akış Android emülatöründe baştan sona doğrulandı. Gerçek telefonda son bir deneme bekliyor.

Yapılanlar:

- Sunucu iskeleti: Node.js, Fastify, SQLite. Çalıştırma: `server` klasöründe `npm run dev`.
- Misafir hesap, e-posta ve şifreyle kayıt ve giriş, çıkış.
- Google ve Apple kimlik jetonlarının sunucuda doğrulanması.
- Uygulamada tanıtım, karşılama, giriş, kayıt ve hesap ekranları.
- 19 sunucu testi ve 44 uygulama testi geçiyor.

İlk denemeden sonra değişenler:

- Uygulama artık sormadan misafir açmıyor; açılışta "misafir olarak devam et", "giriş yap" ve "hesap oluştur" seçenekleri çıkıyor.
- Misafir her açılışta bu ekranı görür ve aynı misafir hesabına döner. Üye bir daha görmez.
- Misafirken hesap açılamıyor; önce çıkış gerekiyor. Misafirin kalıcı hesaba dönüşmesi kaldırıldı.
- Kullanıcı adı değiştirilemiyor.
- Şifre kuralı sıkılaştı: en az 8 karakter, büyük harf, küçük harf, rakam. Kayıt ekranında kurallar canlı işaretleniyor.
- İlk açılışta üç sayfalık tanıtım gösteriliyor.
- Şifre alanının klavye altında kalması düzeltildi: giriş ve kayıt ayrı, kaydırılabilir form ekranlarına taşındı.

Kalanlar:

- Düzeltilmiş akışı gerçek telefonda bir kez denemek.
- Şifre sıfırlama, e-posta doğrulama ve hesap silme.

Ertelenenler:

- Google ve Apple girişinin uygulama tarafı. Sunucu tarafı hazır.

### 5B — Online maç

Durum: tamamlandı (7 Ekim 2026). Emülatör ile ikinci bir oyuncu arasında baştan sona oynandı; iki gerçek telefonla deneme bekliyor.

Yapılanlar:

- Uygulama ile sunucu arasında canlı bağlantı (WebSocket) ve mesaj sözleşmesi.
- Sunucuda maç odası: durumu sunucu tutar, cevabı sunucu doğrular, süreyi sunucu sayar.
- Eşleştirme sırası; bir oyuncu aynı anda yalnızca bir maçta olabilir.
- 6–11 saniyede rakip çıkmazsa bot. Bot gerçek oyuncu gibi görünür; seviyesi zorluğa ve oyuncunun son sonuçlarına göre ayarlanır.
- Kopan bağlantıya geri dönüş: 30 saniye içinde dönen oyuncu maça kaldığı yerden devam eder, dönmeyen hükmen kaybeder.
- Uygulamada rakip arama ekranı, online maç ekranı, kopma ve yeniden bağlanma uyarıları.
- Biten maçların kaydı ve hesap ekranında son maçlar listesi.

Doğrulama: 38 sunucu testi (süre dolması, beraberlik, kopma, hükmen bitiş, aynı anda iki eşleşme dahil) ve 16 uygulama testi. Ayrıca emülatörde: bota karşı online maç, oda koduyla gerçek rakibe karşı maç (üç doğru cevapla galibiyet), ağ kesilip gelince maçın sürmesi.

Kalanlar:

- İki gerçek telefonla deneme.

### 5C — Arkadaş daveti

Durum: tamamlandı (7 Ekim 2026).

- Oda kuran oyuncu beş karakterli kod alır; arkadaşı kodu girince özel maç başlar.
- Kod on dakika geçerlidir; oda sahibi genel sırayla eşleşmez.

### 5D — Barındırma

Durum: hazırlık yapıldı (7 Ekim 2026); yer seçimi ve hesap açma bekliyor.

Yapılanlar:

- Sunucuyu paketleyen `Dockerfile` ve yayına alma adımları ([teknik-mimari.md](teknik-mimari.md), "Yayına alma").

Kalanlar:

- Barındırma yerini seçmek ve hesabı açmak (bu adım hesap sahibini gerektirir).
- TLS, alan adı, veritabanı yedeği.
- Oyuncu görsellerini sunucuya ya da bir depolama servisine taşımak.

Ücretsiz seçenekler (koşullar değişebilir; karar anında doğrulanmalı):

| Seçenek | Uygunluk |
|---|---|
| Kendi bilgisayarında çalıştırıp Cloudflare Tunnel ile dışarı açmak | Kapalı beta için en hızlı yol: kapı açmaya gerek yok, HTTPS ve WebSocket hazır. Bilgisayar açık kalmalı |
| Sürekli ücretsiz sanal sunucu (örnek: Oracle Cloud "Always Free", Google Cloud e2-micro) | Kalıcı disk ve sürekli açık süreç; SQLite ve WebSocket için uygun. Kayıt için kredi kartı doğrulaması ister |
| Uyuyan ücretsiz uygulama servisleri | Uygun değil: süreç uykuya geçince maçlar düşer, ücretsiz katmanda kalıcı disk olmaz |

## Adım 6 — Sıralama ve günlük bulmaca

Durum: tamamlandı (7 Ekim 2026).

Yapılanlar:

- Her oyunun ayrı puanı, toplam puan ve toplam puandan seviye. Puan online sıra maçlarında değişir. Eşleştirme, her oyunda 1000'den başlayan gizli güç puanına yakın rakip arar; görünen puanda seviye hiç düşmez (8 Ekim).
- Gol: hoş geldin hediyesi, artan günlük giriş ödülü, puanlı galibiyet golü; her hareket kayıt defterinde.
- Maç sonunda kazanılan ya da kaybedilen puan, kazanılan gol ve seviye atlama.
- Ayrıntılı geçmiş ve istatistik ekranı: genel sayılar, oyun oyun puan ve sonuçlar, oyuna göre süzülen ve sayfalanan maç listesi, gol hareketleri.
- Süren maçtan çıkarken onay.
- Maç içi jokerler: dokuz modun her birinde iki joker; joker 3 gol, maçta en çok 2; puanlı maçlarda da geçerli.
- Lider tablosu: haftalık (pazartesi sıfırlanır) ve tüm zamanlar; genel ve oyun oyun; ilk 50 ve oyuncunun kendi sırası.
- Günün bulmacası: herkes aynı XOX ızgarasında, 9 tahmin hakkı, nadirlik puanı, bitirince gol, günün sıralaması, sonucu paylaşma.

Bitti sayılır: Bir maçın sonucu puana ve lider tablosuna yansır; günlük bulmaca her gün kendiliğinden değişir.

## Adım 7 — Görsellerin toplu üretimi ve kart koleksiyonu

Durum: büyük kısmı tamamlandı (7 Ekim 2026).

Yapılanlar:

- Izgaralarda cevap olarak çıkabilen oyuncular için (Türkiye pazarı, bilinirlik 32 ve üzeri) toplu üretim: 1.889 oyuncunun 1.232'sinin görseli var (%65; en tanınmışlarda %73).
- Görseller sunucudan veriliyor, uygulama cihazda saklıyor.
- "Görsel kaynakları" ekranı yazar ve lisans verisinden kendiliğinden oluşuyor.

Kalanlar:

- En tanınmış oyuncuların görsellerini elle gözden geçirmek; kötü çıkanları silmek.
- Kaynak yüz ile çizim arasında otomatik kimlik karşılaştırması; yüzü başka birine dönen çizimleri (8 Ekim testinde Arda Güler, Arthur) yeniden üretmek ya da çıkarmak.
- Fotoğrafı elenen tanınmış oyuncular için başka bir Commons fotoğrafı seçebilmek (elle düzeltme tablosu).
- Görselleri bir depolama servisine taşımak (barındırma kararıyla birlikte).
- Kart koleksiyonu.

Bitti sayılır: Tanınmış oyuncuların kartları uygulamada görünür; atıf ekranı eksiksizdir.

## Adım 7B — Yeni oyun modları

Durum: ilk sürüm tamamlandı (7 Ekim 2026). Kurallar ve yapım sırası [oyun-modlari.md](oyun-modlari.md) belgesinde.

Yapılanlar:

- Kariyer istatistikleri: ikinci açık veri seti ve Vikiveri yedeği; piyasa değeri ve millî maç sayısı.
- Sunucuda moddan bağımsız lobi ve oda üreticileri; maç kaydında mod.
- Kart Düellosu: kural motoru, sunucu odası ve bot, uygulama ekranları, ana ekranda oyun seçimi, arkadaş odasında mod. Emülatörde bota karşı ve arkadaş odasında denendi.
- Kadro Kur: kural motoru, sunucu odası ve bot, uygulama ekranı. Emülatörde bota karşı denendi.
- Hangisi Yüksek, Zincir, En Az Bilinen, Açık Artırma, İlk 10 ve Kariyer Yolu: kural motoru, sunucu odası ve bot, uygulama ekranı. Emülatörde bota karşı denendi. En Az Bilinen 8 Ekim'de beraberlikler yüzünden şimdilik kaldırıldı.
- Denge (8 Ekim): her mod ve zorlukta 100'er bot–bot maçıyla ölçüm (taraf avantajı yok; beraberlik ve süreler); bot seviyesinin oyuna özel ve hedef kazanma oranına göre ayarlanması, maç kaydına yazılması; komşu zorlukla eşleşme; Zincir, Açık Artırma ve Kariyer Yolu'nda yazmaya yetecek süreler.
- Kulüplere katılış ve ayrılış yılları uygulama veritabanında.
- Tanıtımın dokuz oyunu, puan ve seviyeyi, golü ve jokerleri anlatacak biçimde yenilenmesi; ilk günlük ödülde hoş geldin hediyesi (8 Ekim).
- İlk geri bildirim düzeltmeleri: her modda "Bota karşı" girişi (sıra beklemeden), aynı cihazda iki kişilik modun kaldırılması, Kart Düellosu ve Hangisi Yüksek'te soru tekrarının önlenmesi, seçilen oyunun listede ortalanması, kart seçerken seçilen kartların arama penceresinde görünmesi, arama sonuçlarından bayrağın kaldırılması, ikinci tekil metinlerin düzeltilmesi, bağlantı hatasında "Tekrar dene".

Kalanlar:

- Gerçek telefonlarda iki kişiyle her modun denenmesi; süre ve puan dengesinin oyuncu geri bildirimine göre ayarlanması.
- Bot ayarlarının beta verisiyle hedef kazanma oranlarına (Kolay %65, Orta %50, Zor %35) çekilmesi.
- Kart Düellosu ve diğer modlar için internetsiz (bota karşı) oyun.
- Turnuva katılımı verisi ("Dünya Kupası'nda oynamış") ve transfer yönü konseptleri.

Bitti sayılır: Dokuz mod da online (bot ve arkadaş odası dahil) oynanır; her biri için kural testleri, sunucu testleri ve emülatörde baştan sona bir maç vardır.

## Adım 8 — Gelir modeli ve mağaza hazırlığı

Durum: sürüyor (8 Ekim 2026). Uygulamanın adı ChallengeGoal; ilk sürümde ödüllü reklam ve gol satın alma olacak.

Yapılanlar: ad, paket kimliği ve ikon; EAS derlemeleri (Android ve iOS); canlı sunucu ve `challengegoal.app`; gizlilik, koşullar ve hesap silme sayfaları (taslak); hesap silme; Google ve Apple ile giriş ve bir kerelik kullanıcı adı seçimi; bildirimler; gol satın alma (dört paket, sunucu doğrulaması, mağaza ekranı; gerçek satın almayla denenmesi mağaza ürünlerinin açılmasını bekliyor); ödüllü reklam (AdMob birimleri, sunucu doğrulaması, mağaza ekranındaki satır); kullanılmayan Android izinlerinin temizlenmesi; şifre sıfırlama (Resend ile kod postası); Google Play'de dört ürünün açılması ve deneme kartıyla satın alma (sunucu doğruladı, goller yazıldı); ödüllü reklamın deneme cihazında uçtan uca çalışması; yönetim paneli; üretilmiş kulüp armaları; reklamla puan koruma; bağlantı uyarısı; mağaza metinleri (Türkçe ve İngilizce); hesap silinince Apple ile giriş jetonunun iptali.

`challengegoal.app` sitesi oyunun görünümüyle baştan yazıldı (kullanıcı ilk halini çok kötü bulmuştu); kullanıcının onayını bekliyor.

Kalanlar: iOS'ta deneme satın alması, AdMob rıza mesajlarının yayımlanması, mağaza sayfalarının doldurulması (metinler `docs/magaza-metinleri.md` dosyasında hazır), ekran görüntüleri ve formlar, yasal metinlerin onayı, kalıcı oyuncu kimlikleri, yeni portrelerin üretimi ve uygulamaya alınması.

- Ödüllü reklam (AdMob; reklam başı 2 gol, günde en çok 5) ve uygulama içi gol satın alma eklenir. Misafir hesap satın alamaz, önce hesap açar. Sunucudaki gol kayıt defterinde bunlar için `ad` ve `purchase` nedenleri hazır; satın alma makbuzu aynı kayda iki kez gol yazdırmaz.
- Gizlilik politikası ve KVKK metni hazırlanır.
- Mağaza sayfaları, ekran görüntüleri ve Türkçe açıklamalar hazırlanır.
- Geliştirici hesapları açılır: Apple yıllık 99 dolar, Google Play tek seferlik 25 dolar.

Bitti sayılır: İki mağazada da test sürümü yüklenebilir durumdadır.

## Adım 9 — Kapalı beta ve yayın

- Android'de kapalı test, iOS'ta TestFlight ile sınırlı bir grupla denenir.
- Google'ın kapalı test şartı (12 test kullanıcısı, 14 gün) yalnızca kişisel geliştirici hesapları için geçerli. Uygulama Play Console'da şirket (kuruluş) hesabında olduğu için bu şart uygulanmıyor (8 Ekim 2026'da kullanıcı doğruladı); mağaza sayfası tamamlanınca doğrudan üretime gönderilebilir.
- Apple geliştirici hesabı da şirket hesabı; iki mağazada da yayıncı şirket olarak görünecek. Yasal metinlerde veri sorumlusu olarak şirket unvanı ve adresi yazılacak (kullanıcıdan bekleniyor).
- Çökme, eşleşme ve veri hataları düzeltilir.

Bitti sayılır: Uygulama iki mağazada yayındadır.

## Adım 10 — Yayın sonrası

- Veri hattı haftalık çalışır; yeni veritabanı uygulamaya güncelleme olarak iner.
- Yeni modlar Adım 7B'ye alındı; yayından sonra kullanıcı ilgisine göre yenileri eklenir.
- Yorumlar ve eşleşme süreleri izlenir.
