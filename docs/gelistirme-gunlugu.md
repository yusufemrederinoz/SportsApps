# Geliştirme Günlüğü

Yeni kayıtlar sona eklenir. Her kayıt ne yapıldığını, ne öğrenildiğini ve karşılaşılan sorunların nasıl çözüldüğünü anlatır.

## 6 Ekim 2026

### Rakip incelemesi

Türkiye mağazasındaki dört uygulamanın sayfaları incelendi.

| Uygulama | İndirme | Puan (oy) | Sunduğu | Yorumlardaki zayıf nokta |
|---|---|---|---|---|
| Tactico | 50 B+ | 3,7 (427) | Yalnızca XOX, online düello, 500+ oyuncu kartı | Her maçtan sonra 30 sn reklam, çift eşleşme hatası, tek mod |
| Futbolcuyu Tahmin Et | 100 B+ | 4,45 (1.300) | 6000 seviye, çevrimdışı, jeton ekonomisi | Az bilinen oyuncular "imkânsız" |
| Futbol Quiz: Ultimate Test | 5 B+ | 4,7 (64) | Çok modlu, 1v1, oda kodu | "Rakip bulunamadı", zorluk seviyesi yok |
| Guess Football Teams | 1 Mn+ | 4,68 (12.704) | Tek mekanik, çevrimdışı | İçerik bir günde bitiyor |

Çıkarılan dersler:

- Online XOX'a talep var; rakibin puanını hatalar ve zorunlu reklam düşürüyor.
- Az oyuncuyla eşleşme bulunamıyor; bot ve arkadaş daveti şart.
- Elle hazırlanan içerik bitiyor; içerik veriden üretilmeli.
- Bir Tactico kullanıcısı "iki takım seç, ikisinde de oynamış oyuncuyu ilk söyleyen kazanır" modunu açıkça istiyor.

Sorun ve çözüm: Mağaza sayfaları sayfa okuma aracıyla alınamadı. Sayfalar doğrudan indirilip içindeki yapısal veri ve açıklama alanı ayrıştırıldı.

### Veri kaynaklarının ölçülmesi

Wikidata ve transfermarkt-datasets aynı sorularla sınandı.

| Ölçüt | Wikidata | transfermarkt-datasets |
|---|---|---|
| Ölçek | 392 bin futbolcu, 263 bininde takım kaydı | 50 bin oyuncu, 175 bin transfer |
| Zaman derinliği | Tüm tarih | Yalnızca 2012 sonrası oynayanlar |
| Galatasaray–Fenerbahçe ortak oyuncu | 63 | 11 |
| Hagi, Hakan Şükür, Alex, Sergen Yalçın | Var | Yok |
| Galatasaray'ın 2023 sonrası transferleri | 60'ın 27'si | Tamamı |

- Sonuç: tek kaynak yetmiyor. Güncel dönem için Transfermarkt seti, tarih için Wikidata gerekli.
- Wikidata'daki serbest lisanslı fotoğraflar ölçüldü: Türk kulüplerinde oynamış oyuncuların %37'sinde var; çok tanınmışlarda %98, tanınmışlarda %82.
- 200 fotoğraflık örneklemde lisansların yaklaşık %70'i CC BY-SA, %15'i CC BY, %13'ü CC0 ya da kamu malı.
- Rastgele ızgara kurulamayacağı görüldü: tanınmış oyuncu şartıyla sekiz büyük Türk kulübünden rastgele kurulan ızgaraların %35'i, on altı kulüpte %1'i geçerli çıktı.

Sorun ve çözüm: Resmî Wikidata sorgu servisi kesintideydi ve dakikada bir isteğe izin veriyordu. QLever aynasına geçildi; aynı sorgular saniyeler içinde çalıştı.

### Adım 1 — Veri hattı

- İki kaynak, Wikidata'da kayıtlı Transfermarkt kimlikleriyle birleştirildi. 219 kulübün 217'si ve kapsamdaki 19.242 Transfermarkt oyuncusunun 17.654'ü doğrudan kimlikle eşleşti.
- Kimliği olmayan oyuncularda doğum tarihi ve isim kullanıldı; bu yolla yalnızca 28 oyuncu eşleşti.
- Çok branşlı kulüp kayıtlarına bağlanmış futbolcular (örnek: 78 oyuncu "Galatasaray SK" kaydında) otomatik olarak futbol takımına bağlandı.
- Tarihî ülkeler ve Transfermarkt'ın ülke yazımları için düzeltme tabloları kuruldu.
- Bilinen cevap testleri yazıldı: dört büyüklerin dördünde de oynayanlar Sergen Yalçın ve Burak Yılmaz çıkıyor; Hagi'nin kulüpleri Real Madrid, Brescia, Barcelona ve Galatasaray.

Öğrenilenler:

- İlk tasarımda eşleştirme doğum tarihi ve isimle yapılacaktı. Wikidata'nın Transfermarkt kimliklerini tuttuğu fark edilince bu yöntem yedeğe alındı; kimlikle eşleştirme çok daha sağlam.
- Wikidata'da "lig" alanı kirli: oyuncular, maçlar ve sezonlar da aynı alana bağlanmış. Kulüp kapsamı Transfermarkt setinden alındı.
- Oyuncu adlarında Transfermarkt adı öne alındı; Wikidata'nın Türkçe etiketi "Alex" yerine "Alexsandro de Souza" veriyordu.

## 7 Ekim 2026

### Adım 2 — Veri temizliği, bilinirlik puanı ve ızgaralar

Veri sorunları ve kurallar:

- Wikidata'da 2026 başlangıçlı 288 doğrulanmamış kayıt bulundu (Salah → Trabzonspor, Leão → Galatasaray gibi). Yalnızca Wikidata'dan gelen ve içinde bulunulan yıl başlayan kayıtlar atılıyor.
- Transfermarkt setinin de eksiksiz olmadığı görüldü: emekli oyuncuların transfer satırları yok, Mandžukić'in Atlético Madrid sezonunun maç kayıtları yok. Bu boşlukları Wikidata dolduruyor; bu yüzden 2013 sonrası Wikidata kayıtları toptan atılmadı.
- Tarihsiz Wikidata kayıtlarında hem doğru hem yanlış örnekler çıktı. Karar: bunlar cevap olarak kabul edilir ama ızgara kurarken sayılmaz.
- Erkek takımına bağlanmış kadın futbolcular kapsam dışı bırakıldı.
- Tamamı küçük harfle yazılmış 77 oyuncu adı düzeltildi.

Bilinirlik puanı:

- İlk sürüm yalnızca Vikipedi dil sayısı, piyasa değeri ve millî maça dayanıyordu. Metin Oktay ile orta düzey bir yabancı oyuncu aynı bantta çıktı.
- Türkçe Vikipedi okunma sayısı eklendi. Son 60 günde Metin Oktay 13.891, Iulian Filipescu 296 kez okunmuş.
- Puan artık pazar bazında tutuluyor; başka bir ülke için o ülkenin Vikipedi'siyle ayrı puan üretilebilir.

Okunma sayılarını çekerken yaşananlar:

| Deneme | Sonuç |
|---|---|
| Başlık başına bir istek, sekiz paralel kanal | Kısa sürede 429 (çok fazla istek) hatası |
| 50 başlıklık toplu istek, tek kanal | Çalıştı ama 50 başlık yaklaşık 20 saniye sürdü |
| Toplu istek, üç paralel kanal | 4.150 oyuncudan sonra yine 429 |
| Toplu istek, isteklerde depo adresi kimlik olarak | 50 başlık 1–2 saniye; 15.567 oyuncu birkaç dakikada tamamlandı |

Ders: Wikimedia kimliksiz istemcileri sıkı kısıtlıyor. İsteklerde iletişim bilgisi göndermek hem kurala uygun hem çok daha hızlı.

Izgara üretimi:

- İlk üreticide Fenerbahçe ve Galatasaray ızgaraların yaklaşık %70'inde çıktı, çünkü kulüpler arası ortak oyuncuların çoğu bu kulüplerden geçiyor.
- Bir başlığın bir seviyedeki ızgaraların en çok %30'unda yer almasını sağlayan sınır eklendi.
- Rastgele satır seçimi çoğu denemede boşa gidiyordu. Her satırı, kalan sütun adayları yetecek şekilde seçen yönlendirilmiş örneklemeye geçildi; seviye başına 1.500 ızgara birkaç saniyede üretiliyor.
- Sonuç: Türkiye pazarı için üç seviyede 1.500'er, toplam 4.500 ızgara.

Çok dilli ve çok pazarlı şema:

- Uygulamanın yurt dışında da çalışması istendi. `name_tr` gibi dile özgü sütunlar kaldırıldı; kulüp ve ülke adları dil sütunlu tablolara taşındı.
- Bilinirlik puanı ve ızgaralar pazar boyutu kazandı. Türkiye, yapılandırma dosyasındaki ilk pazar.

### Adım 4 — Uygulama

Kural motoru (`packages/game-core`):

- Maç akışı, bitiş koşulları ve çekilme yazıldı.
- Bot eklendi: kazandıran ve engelleyen hücreyi tanıyor, cevabını tanınmış oyunculardan seçiyor.
- Ad sadeleştirme TypeScript'e de yazıldı. Python sürümüyle 214 adlık ortak dosya üzerinden karşılaştırıldı; tek fark (görünmez bir birleştirici karakter) Python tarafı düzeltilerek giderildi.

Uygulama iskeleti:

- Expo SDK 57 projesi kuruldu, şablonun örnek ekranları ve lisans dosyası kaldırıldı.
- Çok dilli altyapı kuruldu: cihaz dili desteklenmiyorsa İngilizce. Çeviri dosyalarının aynı anahtarları ve aynı değişkenleri taşıdığını bir test denetliyor.

Veritabanı ve ekranlar:

- Veri hattı uygulama için küçültülmüş bir veritabanı üretiyor (13 MB) ve içinde ad araması için tam metin dizini var. "calhan" yazınca Hakan Çalhanoğlu bir milisaniyenin altında bulunuyor.
- Sorgular yazıldı ve gerçek veritabanına karşı test edildi: pazar seçimi, ızgara yükleme, arama, cevap doğrulama, bot seçenekleri.
- Ana ekran ve maç ekranı yazıldı: zorluk seçimi, bota karşı ya da aynı cihazda iki kişi, hücreye dokununca arama, 20 saniyelik sayaç, sonuç.

Sorunlar ve çözümleri:

| Sorun | Çözüm |
|---|---|
| Tip denetimi, stil dosyası içe aktarımını tanımadı | Expo'nun geliştirme sunucusu başlarken ürettiği tip dosyası eksikti; dosya üretilince geçti |
| Lint, şablondan gelen tema kancasında efekt içinde durum güncellemesini hata saydı | Kanca, dış kaynak aboneliğiyle yeniden yazıldı |
| Test dosyası Node modüllerini tanımadı | Node tip tanımları eklendi |
| Lint ilk çalıştırmada kendi kurduğu paketi bulamadı | İkinci çalıştırmada düzeldi |

Doğrulama durumu:

- Geçenler: 23 veri testi, 24 kural motoru testi, 22 uygulama testi, tip denetimi, lint, Android paketleme.
- Yapılmayan: uygulama gerçek cihazda ya da tarayıcıda görülerek denenmedi.

### Oyun hissi ve arayüz teknolojisi

Arayüzün iddialı olması istendi. Şu anki ekranlar işlevsel bir iskelet; görsel kimlik ve oyun hissi ayrı bir adım olarak plana eklendi (Adım 4B).

- Teknoloji seti onaylandı: Skia, Reanimated, Lottie, expo-haptics, expo-audio. Hepsinin Expo SDK 57 tarafından sürüm sabitlendiği denetlendi.
- Oyun motoru kullanılmayacak: sıra tabanlı, isim yazmaya dayalı bir oyunda motor yük getirir.
- Rive değerlendirildi ama eklenmedi; Expo SDK 57 sürümünü sabitlemiyor.
- Görsel yön "gece stadyumu" olarak seçildi. Diğer seçenekler çıkartma albümü, temiz ve sportif, retro arcade idi.

### Belgeleme

Yapılan işlerin düzenli belgelenmesi istendi. `docs` altına belge dizini, teknik mimari ve bu günlük eklendi; her adımda güncellenecek.

### Adım 4'ün cihaz denemesi

Uygulama telefonda Expo Go ile açıldı ve denendi; hata görülmedi. Adım 4 tamamlandı.

### Adım 4B — Gece stadyumu tasarım dili, ilk sürüm

- Tasarım kuralları `tasarim-dili.md` belgesine yazıldı: renkler, tipografi, bileşenler, hareket, titreşim, ses, erişilebilirlik.
- Yazı tipi olarak Barlow Condensed (başlık) ve Barlow (gövde) seçildi; spor ve skor tabelası havası veriyor, Türkçe karakterleri destekliyor.
- Taraf renkleri mavi ve kehribar seçildi. Kırmızı bilerek taraf rengi yapılmadı; hata ve süre uyarısına ayrıldı.
- Açık tema kaldırıldı; uygulama yalnızca koyu görünümle çalışıyor.
- Stadyum zemini ve sayaç halkası Skia ile çizildi. Hücre alma, sonuç ve kazanma animasyonları Reanimated ile yapıldı.
- Sesler şimdilik kodla üretildi (düdük, doğru, yanlış, tik, kazanma). Yer tutucudur.

Sorunlar ve çözümleri:

| Sorun | Çözüm |
|---|---|
| Lint, animasyon değerine doğrudan atamayı hata saydı | Reanimated'in `.get()` ve `.set()` yöntemlerine geçildi |
| React Native'in yeni sürümünde `absoluteFillObject` yok | `absoluteFill` kullanıldı |
| Skia belgelerinin adresleri değişmişti | Kurulu paketin tip tanımları okunarak API doğrulandı |
| npm, Skia'nın kurulum betiğini çalıştırmadı | Expo Go için gerekmiyor; yerel derleme öncesi onay gerektiği belgeye yazıldı |

Doğrulama: tip denetimi, lint, 22 uygulama testi ve Android paketleme geçiyor. Görünüm cihazda henüz incelenmedi.

### Adım 4B — İkinci sürüm: EA FC Ultimate Team çıtası

Birinci sürüm telefonda incelendi ve yetersiz bulundu. Dört başlığın dördü de zayıf olarak işaretlendi: oyun gibi değil, animasyonlar zayıf, ızgara çekici değil, renk ve yazı oturmamış. Hedef çıta EA FC Ultimate Team olarak seçildi.

Çıkarılan ders: birinci sürüm ekranı görmeden, yalnızca renk ve yazı tipi değiştirerek yazılmıştı. Bu bir yeniden boyamaydı, tasarım değildi. Oyunun merkezindeki nesne (hücre) kendi başına çekici olmadıkça hiçbir renk paleti oyun hissi vermiyor.

Yapılanlar:

- Palet değişti: nötr koyu zemin, marka vurgusu olarak volt yeşili, taraflar için altın ve mavi metalik kaplamalar.
- Başlık yazısı eğik ve daha kalın yapıldı (Barlow Condensed ExtraBold Italic).
- Alınan hücre metalik oyuncu kartına dönüştü. Bunun için arama ve bot cevabı artık oyuncunun mevkisini ve bayrağını da taşıyor.
- Izgara zemini tek Skia tuvaline alındı; kartlar ve efektler ayrı katmanlarda.
- Kural motoruna kazanan üçlüyü bulan işlev eklendi; kazanan kartlar vurgulanıyor.
- Yeni animasyonlar: kart gelişi, kıvılcım, sarsılma, damga, skor sıçraması, sayaç atışı, sonuç perdesi, konfeti.
- İki yeni yer tutucu ses: tok vuruş ve hışırtı.
- Skia'nın kurulum betiği onaylandı ve çalıştırıldı; yerel derleme için gereken dosyalar yerinde.

Önizleme arayışı:

- Bu makinede Android emülatörü yok.
- Web önizlemesi denendi ve bırakıldı: Skia ve veritabanı kütüphanesinin web kurulumu belirsiz ve uzun.
- Karar: görünüm, telefondan atılan ekran görüntüleriyle incelenecek.

Doğrulama: tip denetimi, lint, 22 uygulama testi, 24 kural motoru testi ve Android paketleme geçiyor. Görünüm henüz incelenmedi.

### Tasarımın kabulü ve yön değişikliği

- İkinci tasarım sürümü incelendi ve "bu şekilde kalabilir" denerek kabul edildi. Adım 4B kapandı.
- Oyuncu görselleri (Adım 3) ertelendi. Sıradaki iş sunucu tarafı: hesaplar, online maç, maç geçmişi.

Bu oturumda verilen kararlar:

| Konu | Karar | Diğer seçenekler |
|---|---|---|
| Sunucu veritabanı | SQLite | PostgreSQL |
| Giriş yöntemleri | Misafir, e-posta ve şifre, Google, Apple; hepsi | Yalnızca misafir ve e-posta; yalnızca misafir ve Google/Apple; kullanıcı adı ve şifre |
| Botun görünümü | Gerçek oyuncu gibi, rastgele adla | Bot olduğu belli olsun |

Botun gerçek oyuncu gibi görünmesi için "oyuncuyu yanıltır, fark edilirse güven kaybettirir" uyarısı yapıldı; karar bu bilinerek verildi.

### Adım 5A — Hesaplar

Sunucu:

- `server` çalışma alanı kuruldu: Node.js 24, Fastify, Node'un kendi SQLite modülü. Derleme adımı yok; TypeScript `tsx` ile çalışıyor.
- Uygulama ile sunucunun paylaştığı tipler ve doğrulama kuralları `packages/protocol` paketine alındı.
- Misafir, kayıt, giriş, çıkış, hesap bilgisi ve kullanıcı adı değiştirme uçları yazıldı.
- Google ve Apple kimlik jetonları `jose` ile, sağlayıcının açık anahtarlarına karşı doğrulanıyor.
- Sunucu gerçekten çalıştırılıp denendi: misafir açıldı, kayıtla yerinde dönüştü, eski oturum düştü.

Uygulama:

- Açılışta saklanan oturum denenir; yoksa ya da geçersizse yeni misafir açılır; sunucu yoksa uygulama çevrimdışı kalır ve offline oyun çalışır.
- Jeton cihazın güvenli deposunda saklanır.
- Ana ekranın sağ üstüne hesap rozeti, ayrıca kayıt ve giriş formlu bir hesap ekranı eklendi.
- Geliştirme sırasında sunucu adresi Expo'nun çalıştığı bilgisayardan kendiliğinden bulunur.

Tasarım tercihleri ve gerekçeleri:

| Tercih | Gerekçe |
|---|---|
| Oturum için imzalı jeton (JWT) yerine rastgele jeton | Tek jeton türü, yenileme akışı yok, anında iptal edilebiliyor; bu ölçekte veritabanı sorgusu yük değil |
| Şifre için scrypt | Node'un içinde geliyor; yerel derleme gerektiren ek paket yok |
| Kullanıcı adında aksan gözetmeyen benzersizlik | "Çağrı" ile "Cagri" gibi karıştırılabilecek adları engeller |
| Misafirin yerinde dönüşmesi | Kayıt olan oyuncu geçmişini ve puanını kaybetmez |
| Doğrulama şeması için ek kütüphane kullanılmadı | Fastify'ın kendi şema doğrulaması yetiyor; bağımlılık az kalıyor |

Sorunlar ve çözümleri:

| Sorun | Çözüm |
|---|---|
| Testler geçtiği hâlde sunucu açılmadı: ortak paketten dışa aktarılan adlar bulunamadı | Ortak paketler modül türünü belirtmiyordu; test aracı bunu hoş görüyor, Node görmüyor. Paketlere modül türü eklendi |
| Uygulama testleri kısa yol takma adını (`@/`) tanımadı | Test aracına takma ad ayarı eklendi |
| Kabukta, içinde ters tırnak geçen çok satırlı komutlar ayrıştırılamadı | Bu tür içerik dosya düzenleme aracıyla yazıldı |

Ders: testlerin geçmesi sunucunun açıldığını göstermez. Sunucu her dilimde gerçekten çalıştırılıp bir istekle denenmeli.

Doğrulama: 20 sunucu, 31 uygulama, 24 kural motoru testi; tip denetimi, lint ve Android paketleme geçiyor. Hesap ekranı telefonda henüz denenmedi.

### Adım 5A — Giriş akışının yeniden yazılması

Hesap ekranı telefonda denendi ve yedi düzeltme istendi. Hepsi uygulandı.

| İstek | Yapılan |
|---|---|
| Google ve Apple girişi sonraya | Uygulama tarafı ertelendi; sunucu tarafı duruyor |
| Şifre alanı klavyenin altında kalıyor, içerik düzgün değil | Giriş ve kayıt ayrı form ekranlarına taşındı. Form, klavye yüksekliği kadar alt boşluk ekliyor ve odaklanan alanı yukarı kaydırıyor |
| İlk açılışta misafir ya da giriş seçeneği çıksın | Sormadan misafir açma kaldırıldı; karşılama ekranı eklendi |
| Misafir, çıkış yapmadan hesap açamasın | Misafirin yerinde dönüşmesi kaldırıldı. Sunucu, oturum açıkken gelen kayıt ve giriş isteklerini reddediyor |
| Kullanıcı adı güncellenemesin | Değiştirme ucu ve formu kaldırıldı |
| Şifre için kalıp olsun | En az 8 karakter, büyük harf, küçük harf, rakam. Kayıt ekranında kurallar yazdıkça işaretleniyor |
| Açılışta tanıtım ekranı olsun | Üç sayfalık tanıtım eklendi; bir kez gösteriliyor |

Aynı oturumda gelen ek kural: misafir her açılışta giriş ekranını görür ve "misafir olarak devam et" dediğinde aynı misafir hesabı açılır; e-postayla giren bir daha giriş ekranı görmez.

Bunun için cihazda iki ayrı jeton tutuluyor: misafir jetonu kalıcı, üye jetonu yalnızca giriş yapılmışken var. Misafirin "çıkışı" sunucudaki misafir oturumunu kapatmıyor, yalnızca karşılama ekranına döndürüyor.

Tasarım notları:

- Şifre kuralı varsayılanını ben seçtim (özel karakter şartı yok); kural tek yerde, ortak pakette duruyor.
- Klavye için hazır kütüphane kullanılmadı, çünkü Expo Go içinde gelmiyor ve uygulama şu an Expo Go ile deneniyor.
- Ekranların açılıp kapanması Expo Router'ın korumalı yığınına bırakıldı; elle yönlendirme yok. (Bu karar bir sonraki başlıkta geri alındı.)

Geri alınan iş: bir önceki dilimde yazılan "misafir kayıt olunca yerinde kalıcı hesaba dönüşür" davranışı ve kullanıcı adı değiştirme. İkisi de istenmeden eklenmişti. Sonucu: misafirken oynanan maçlar üye hesabına taşınmayacak.

Doğrulama: 19 sunucu ve 40 uygulama testi, tip denetimi, lint, Android paketleme geçiyor. Sunucu çalıştırılıp kurallar canlı denendi: misafirken kayıt 409, zayıf şifre 400, çıkış yapılmış kayıt 200, misafir jetonu sonrasında hâlâ geçerli, kullanıcı adı değiştirme 404. Yeni ekranlar telefonda henüz denenmedi.

### Adım 5A — Açılışta takılma

Yeni giriş akışı telefonda açıldığında uygulama açılış ekranında takılı kaldı. Hata cihazda görülmeden, kod okunarak arandı; kesin neden doğrulanamadı. Takılmaya yol açabilecek üç nokta bulundu ve üçü de kaldırıldı.

| Olası neden | Yapılan |
|---|---|
| Açılış ekranının kapanması hesap durumunun yüklenmesine bağlanmıştı; yükleme bitmezse ekran hiç kapanmıyordu | Açılış ekranı yeniden yalnızca yazı tipleri yüklenince kapanıyor (son çalışan sürümdeki davranış) |
| Kayıtlı oturum okunurken oluşan bir hata yakalanmıyordu; hesap durumu sonsuza kadar "yükleniyor" kalıyordu | Hata yakalanıyor, terminale yazılıyor ve uygulama tanıtım ekranından devam ediyor |
| Tanıtımın bitişi önce cihaza yazılıyor, sonra ekrana yansıyordu; yazma başarısız olursa tanıtımdan çıkılamıyordu | Önce ekran ilerliyor, yazma hatası akışı durdurmuyor |

Ek olarak ekran koruması değişti. Expo Router'ın korumalı yığını bırakıldı; her ekran artık `EntryGate` ile sarılı. Kapı, hesap durumuna göre dört sonuçtan birini verir: yükleniyor, tanıtım, karşılama, oyun. Ekran kendi grubunda değilse doğru ekrana yönlendirir. Neden: korumalı yığında ilk ekranın kendisi kapalıyken ne olacağı cihazda doğrulanamıyordu; açık yönlendirme adım adım izlenebiliyor.

Küçük ekler: hesap durumu yüklenirken dönen bir gösterge çıkıyor; "misafir olarak devam et" düğmesi sunucu beklenirken "Bağlanıyor…" yazıyor.

Doğrulama: 44 uygulama testi (giriş kararı için 4 yeni), tip denetimi, lint, Android paketleme geçiyor. Bu araçlar çalışma anındaki bir takılmayı yakalayamaz; düzeltme telefonda henüz doğrulanmadı.

## Commit listesi

| Commit | Tarih | İçerik |
|---|---|---|
| `4e36a70` | 6 Ekim | Yönelim ve iş planı belgeleri |
| `928a330` | 6 Ekim | Veri hattı: Transfermarkt seti ile Wikidata'nın birleştirilmesi |
| `35ca2ba` | 7 Ekim | Expo iskeleti, çok dilli altyapı, kural motoru |
| `c790220` | 7 Ekim | Maç kuralları ve çok dilli yapı kararları |
| `a826e81` | 7 Ekim | Bilinirlik puanı, ızgara üretici, dil ve pazar boyutlu şema |
| `0447fc8` | 7 Ekim | Şablondan kalan yorumun silinmesi |
| `7f3da39` | 7 Ekim | Planın ızgara sonuçlarıyla güncellenmesi |
| `b9ac818` | 7 Ekim | Uygulama veritabanı, ortak ad sadeleştirme, bot |
| `b00357b` | 7 Ekim | Seviye eşiklerinin veritabanına yazılması |
| `a7a0579` | 7 Ekim | Offline maç ekranı, arama, bot |
| `32b76f9` | 7 Ekim | Belgeler: günlük, teknik mimari, belge dizini |
| `2afe0d8` | 7 Ekim | Arayüz teknolojisi ve görsel yön kararları |
| `ed57182` | 7 Ekim | Gece stadyumu tasarım dili: zemin, sayaç, animasyon, titreşim, ses |
| `c25712e` | 7 Ekim | Arayüzün metalik oyuncu kartları etrafında yeniden tasarımı |
| `0b2b056` | 7 Ekim | Hesap sunucusu: misafir, şifre, Google ve Apple doğrulaması |
| `829de6d` | 7 Ekim | Uygulamada hesap istemcisi ve hesap ekranı |
| `a00409b` | 7 Ekim | Giriş akışının yeniden yazılması: tanıtım, karşılama, ayrı hesaplar |
| `d4e1dd0` | 7 Ekim | Açılışta takılmanın giderilmesi: ekran kapısı, hataya dayanıklı oturum yükleme |
