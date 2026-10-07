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

### Android emülatörü ve açılış hatasının kök nedeni

Telefondaki hatayı uzaktan okumak mümkün olmadı (Expo Go'nun JS motoru uzaktan hata ayıklamaya izin vermiyor). Bunun üzerine bilgisayara Android emülatörü kuruldu.

Kurulum:

| Bileşen | Yer | Not |
|---|---|---|
| Android SDK (platform araçları, emülatör, Android 16 sistem görüntüsü) | `%LOCALAPPDATA%\Android\Sdk` | Yaklaşık 6 GB |
| JDK 17 (taşınabilir) | `%LOCALAPPDATA%\Android\jdk-17` | Yalnızca SDK araçları için. Sistemdeki Java 8'e ve PATH'e dokunulmadı |
| Sanal cihaz `sportapps` | `%USERPROFILE%\.android\avd` | Pixel 7, Android 16, Türkçe |

Android SDK lisansları kurulum sırasında kabul edildi. Kullanım komutları [teknik-mimari.md](teknik-mimari.md) içinde.

Kök neden: önceki sürüm emülatörde çalıştırılınca takılma birebir yeniden üretildi. `expo-sqlite`'ın `SQLiteProvider` bileşeni yalnızca çocukları değiştiğinde yeniden çizilmiyor; karşılaştırması `children`'ı yok sayıyor. Önceki sürümde "yazı tipleri hazır" bilgisi bu bileşenin içinden bir alt bileşene prop olarak geçiyordu. Bilgi alt bileşene hiç ulaşmadı, açılış ekranı da hiç kapanmadı. Bir önceki başlıktaki düzeltme bu yapıyı zaten kaldırmıştı; emülatörde ilk açılış, ikinci açılış ve Türkçe açılış doğrulandı.

Kural: `DatabaseProvider` altına yalnızca sabit öğe konur; değişen bilgi context ile taşınır.

Emülatörde bulunan diğer hatalar:

| Hata | Neden | Düzeltme |
|---|---|---|
| Kayıt ya da girişten sonra ekran dönen göstergede kalıyor | Kapı, önce üst ekranları kapatıp sonra yönlendiriyordu; iki adım yarışıyordu | Yığın tek adımda sıfırlanıyor |
| Düğmelerde son kelime görünmüyor ("GİRİŞ YAP" yerine "GİRİŞ") | Android, eğik başlık yazı tipini harf aralığıyla birlikte dar ölçüyor; son kelime görünmeyen ikinci satıra düşüyor | Düğme yazısı ve damga yazısı satırı dolduruyor; genişlik artık ölçüme bağlı değil |
| Geliştirme modunda ekranı kapatan Skia uyarıları | Eski yol çizim arayüzü kullanılıyordu | Yeni yol kurucu arayüzüne geçildi |

Emülatörde doğrulanan akış: tanıtım, karşılama, hesap oluşturma (klavye açıkken alanlar görünür), çıkış, giriş, ana ekranda geri tuşu (uygulamadan çıkar), üye olarak yeniden açılış (doğrudan ana ekran), misafir olarak yeniden açılış (karşılama), maç ekranı.

Not: emülatör pencereli ve donanım hızlandırmalı çalışırken ekran kartı bağlamı kaybolunca çöktü. Gözetimsiz çalışmada penceresiz ve yazılım tabanlı çizimle başlatılıyor.

### Adım 5B ve 5C — Online maç ve arkadaş odası

Online maç baştan sona yazıldı. Ayrıntılar [teknik-mimari.md](teknik-mimari.md) içindeki "Online maç" bölümünde.

Kararlar (soru sormadan, en az riskli seçenekle verildi):

| Konu | Karar | Neden |
|---|---|---|
| Maçın sahibi | Sunucu | Uygulamaya güvenilirse hile kolaylaşır; sunucu cevabı kendi veritabanında doğruluyor |
| Bağlantı | WebSocket, Fastify eklentisiyle | Ücretsiz, sunucuya ek servis gerektirmiyor |
| Ortak sorgular | Yeni `packages/football-data` paketi | Uygulama ile sunucu aynı SQL ile doğruluyor; iki ayrı kopya zamanla ayrışırdı |
| Eşleştirme sırası | Pazar ve zorluk başına | Farklı zorluk seçenleri aynı ızgarada buluşturmak haksız olurdu |
| Bot bekleme süresi | 6–11 saniye, rastgele | Kısa bekleme; sabit süre botu ele verirdi |
| Bot adı | Pazara göre ad havuzu; üçte biri misafir adı biçiminde | Gerçek oyuncuların çoğu misafir adı taşıyor, bot arada kaybolmalı |
| Botun kaçırdığı sıra | Çoğunlukla yanlış ama akla yatkın bir cevap, bazen süre dolması | Her seferinde süreyi dolduran rakip inandırıcı değil |
| Kopma payı | 30 saniye | Kısa ağ kesintisini affeder, rakibi uzun bekletmez |
| Arkadaş odası kodu | Beş karakter, karışan harfler yok | Sesli söylenip yazılabilir |
| Maç geçmişi | Bu adımda yapıldı | Bot seviyesini oyuncuya göre ayarlamak için sonuçlara ihtiyaç vardı |

Emülatörde doğrulananlar: rakip arama ekranı, bota karşı online maç ("canaslan", "muratcimbom" gibi adlarla), oda koduyla ikinci bir oyuncuya karşı maç (emülatör arayüzden üç doğru cevap verip kazandı), ağ kesilince "yeniden bağlanılıyor" uyarısı ve ağ gelince maçın sürmesi, hesap ekranında maç geçmişi.

Yan değişiklikler:

- Ana ekran kaydırılabilir oldu; "nasıl oynanır" bölümü kaldırıldı (tanıtım ekranı aynı işi görüyor), yerine online ve arkadaş kartları geldi.
- Maç ekranı, yerel ve online maçın ortak kullandığı bir görünüme ayrıldı.
- Türkçede "ONLİNE" yazımı yerine başlıklarda "ONLINE" kullanıldı.

Dikkat: yeni çalışma alanı paketi eklendiği için çalışan Expo sunucusu yeniden başlatılmalı (`npx expo start`); yoksa "Unable to resolve @sportapps/football-data" hatası verir.

### Adım 3 ve 7 — Oyuncu görselleri (yerel yapay zekâ)

Ertelenen görsel işi yapıldı: pilot, yöntem seçimi, toplu üretim ve uygulamaya bağlama. Hattın ayrıntısı [teknik-mimari.md](teknik-mimari.md) içindeki "Görsel hattı" bölümünde.

Kararlar (soru sormadan, ücretsiz ve en az riskli seçenekle verildi):

| Konu | Karar | Neden |
|---|---|---|
| Fotoğraf kaynağı | Wikimedia Commons, yalnızca CC0, kamu malı, CC BY ve CC BY-SA | Değiştirilmiş kopyaya izin veren tek kaynak; yönelim belgesindeki kararla aynı |
| Yöntem | Yerel ekran kartında SDXL ile çizime çevirme | Ücretsiz, veri bilgisayardan çıkmıyor, ticari kullanıma izin veren lisans |
| Benzerliği koruma | ControlNet, yalnızca baş bölgesinin kenar çizgileriyle | Yüz hatları kalıyor, giysi ve arka plan serbestçe yeniden çiziliyor |
| Logolar | Çizimden önce arka plan düz renge, giysi tek renge çevriliyor | "Gerçek logo yok" kuralı; forma armaları ve sponsor panoları çizime geçmiyor |
| Kart görünümü | Arka planı saydam kesim, kartın metalik zemini üstünde | EA FC kartlarındaki görünüm; koyu kare bir fotoğraf kartın içinde yama gibi dururdu |
| Yüz tanıma modeli | Kullanılmadı | Benzerliği artıran hazır modellerin lisansı ticari kullanıma izin vermiyor |
| Dağıtım | Görselleri sunucu veriyor, uygulama cihazda saklıyor | 1.000'den fazla görsel uygulama paketini onlarca MB büyütürdü |
| Kaynak gösterme | Uygulamada "Görsel kaynakları" ekranı | CC BY ve CC BY-SA yazar ve lisansın gösterilmesini şart koşuyor |

Pilotta denenenler:

| Deneme | Sonuç |
|---|---|
| Klasik filtre (kenar koruyan yumuşatma, renk azaltma, çizgi) | Fotoğrafın posterleşmiş hâli; logolar, yazılar ve arka plan aynen kalıyor. Elendi |
| Model, güç 0,50 | Fazla fotoğraf gibi; armalar okunuyor |
| Model, güç 0,74 | Çizim tarzı güçlü ama benzerlik kayboluyor |
| Model, güç 0,66 ve ön temizlik | Seçildi: tanınır yüz, düz forma, temiz kesim |

Yolda çözülen sorunlar:

| Sorun | Çözüm |
|---|---|
| Model indirmesi takıldı | Hugging Face'in yeni aktarım katmanı kapatıldı; büyük dosyalar çok bağlantılı indiriciyle alındı |
| Sponsor panoları ve armalar çizime geçti | Çizimden önce arka plan ayırma ve giysiyi tek renge çevirme |
| Baş elipsinin dışındaki saç forma sanıldı | Çene çizgisinin üstü olduğu gibi bırakılıyor |
| Büyük yüzlerde "yüz yok" | Algılayıcı büyük yüzde güvenini yitiriyor; görüntü üç ölçekte taranıyor |
| Kenara yakın duran oyuncu eleniyordu | Kırpma kutusu fotoğrafın içine kaydırılıyor; çizim sonradan yüze göre ortalanıyor |
| Yakın çekim portreler eleniyordu | Kenarlar düz renkle dolduruluyor; kesik omuzlar kartta isim bandının altında kalıyor |
| Düşük çözünürlüklü kaynakta yüz başkasına benziyor | 300 pikselden küçük kaynaktan görsel üretilmiyor |
| Kadrajda iki kişi, tam profil, kesik baş | Otomatik eleniyor |

Sonuç (Türkiye pazarı, bilinirlik 32 ve üzeri, 7 Ekim 2026): 1.889 oyuncudan 1.232'sinin görseli üretildi (%65). Toplam boyut 26 MB, görsel başına ortalama 18 KB. Üretim yaklaşık iki buçuk saat sürdü; hata veren görsel olmadı.

| Aşama | Oyuncu |
|---|---|
| Izgaralarda cevap olabilen | 1.889 |
| Commons fotoğrafı olan | 1.665 |
| Serbest lisanslı | 1.647 |
| Otomatik elemeden geçen | 1.322 |
| Kaynağı yeterince büyük olan, görseli üretilen | 1.232 |

Elenenler: yüz bulunamayan ya da çok küçük 119, başı kadrajdan taşan 88, tam profil 68, kadrajda ikinci kişi 50, düşük çözünürlük 90, serbest olmayan lisans 18.

| Bilinirlik | Görseli olan |
|---|---|
| 60 ve üzeri | 277 / 378 (%73) |
| 50–59 | 255 / 356 (%71) |
| 42–49 | 267 / 427 (%62) |
| 32–41 | 433 / 728 (%59) |

Lisans dağılımı: CC BY-SA 4.0 427, CC BY-SA 3.0 322, CC BY 2.0 136, CC BY 3.0 88, CC BY 4.0 62, CC0 58; kalanı diğer CC BY, CC BY-SA sürümleri ve kamu malı.

Kalite: 60 görsellik rastgele örneklemde 55 kadarı iyi, birkaçı (yarı profil ya da zayıf kaynak) vasat. Görseller tek tek elle gözden geçirilmedi. Görsel başına süre güç sınırlı çalışan RTX 5080 Laptop'ta yaklaşık 7–10 saniye; maliyet yalnızca elektrik.

Uygulama tarafı: kart, görseli olan oyuncuda görseli metalik zeminin üstünde gösteriyor; görsel yoksa eski hâliyle kalıyor. Emülatörde gerçek bir maçta doğrulandı.

Aynı oturumda yapılan küçük düzeltmeler:

- Türkçe arayüzde yabancı adlar artık Türkçe kuralla büyütülmüyor ("MANCHESTER CITY", "LIVERPOOL"); yerli kulüp, ülke ve yerli oyuncu adları Türkçe kuralla büyütülüyor ("BEŞİKTAŞ", "BREZİLYA").
- Kartta iki kelimelik adların ikinci kelimesi kayboluyordu; ad artık bandın tamamına yayılıyor.

### Yeni oyun modları — plan, istatistikler ve Kart Düellosu

Kullanıcı iki YouTube videosunu (indirmeden, yalnızca sayfa bilgisi ve önizleme kareleriyle) inceletti ve uygulamanın yalnızca XOX olmayacağını, bu videolardaki gibi oyunlar da içereceğini söyledi. Kurallar kullanıcının düzeltmeleriyle netleşti, önerdiğim yedi mod da istendi. Dokuz modun kuralları ve yapım sırası [oyun-modlari.md](oyun-modlari.md) belgesinde.

**İstatistik kaynağı.** Mevcut Transfermarkt veri setinde maç kayıtları 2012'den başlıyor; gol ve asist toplamları eski oyuncular için eksik kalıyordu. Kullanıcının yönlendirmesiyle başka bir ücretsiz kaynak arandı. `salimt/football-datasets` (Transfermarkt'tan türetilmiş, Kaggle'da CC0) sezon sezon maç, gol, asist ve kart veriyor; kapsamadığı oyuncular için Vikiveri'nin kulüp kayıtlarındaki maç ve gol sayıları kullanılıyor. Sonuç: 29.624 oyuncunun kariyer toplamı; cevap olabilen 1.889 oyuncunun 1.818'inde istatistik (%96), 1.392'sinde asist (%74). Piyasa değeri ve millî maç sayısı da uygulama veritabanına eklendi.

**Ortak oturum altyapısı.** Sunucudaki lobi, XOX'a bağlı olmaktan çıkarıldı: her mod bir oda üreticisi veriyor, lobi eşleştirme, arkadaş odası, kopma, hükmen bitiş ve maç kaydını mod ne olursa olsun aynı kurallarla yürütüyor. Maç kaydına mod sütunu eklendi. XOX'un mesajları ve testleri değişmeden geçti.

**Kart Düellosu.** Kural motoru (`packages/game-core`), sunucu odası, bot ve uygulama ekranları yazıldı:

- Kart seçme ekranı: konsept başlığı ve sayaç, 7 kart yuvası, konsepte göre süzülen arama (arama penceresi 7 kart dolana kadar açık kalıyor), "Rastgele tamamla" ve "Hazırım".
- Tur ekranı: skor tablosu ve sayaç, soru levhası, ortada iki kart yeri (rakibin oynadığı kart kapalı görünür), altta el; kart seçilince öne çıkar, "Bu kartı oyna" ile gönderilir.
- Açılış: iki kart çevrilir, değerler ve "+1" belirir, kaybeden kart soluklaşır, "Tur senin / Tur rakibin / Tur berabere" yazısı ve sesler.
- Sonuç: XOX ile aynı sonuç ekranı.

Doğrulama: çalışan geliştirme sunucusunda betikle bota karşı tam maç (7 tur, 82 saniye); emülatörde bota karşı tam maç (kart seçimi, aramayla 5 kart, rastgele tamamlama, 7 tur, sonuç ekranı); betikle kurulan arkadaş odasına emülatörden kodla katılma ve maçtan ayrılınca rakibin hükmen kazanması.

Emülatörde bulunan ve düzeltilen iki sorun: kartlar açıkken sayaç kırmızı "0" gösteriyordu; el bir sıraya inince yukarı kayıyordu (artık ekranın altına sabit).

Veriyle ilgili gözlemler:

- Vikiveri'den gelen sayılar yalnızca lig maçlarını kapsıyor; birinci kaynaktan gelen oyuncularla aynı soruda karşılaşınca fark doğuyor. Bilinirliği 45 ve üzeri oyuncuların %20'si Vikiveri kaynaklı (Hagi, Sneijder, Sergen Yalçın gibi).
- "Eksik kariyer" işareti güvenilir çıkmadı; düelloda kullanılmıyor.
- Teknik direktör ve başkan olarak tanınan bazı adlar (Süleyman Seba gibi) oyuncu kaydıyla havuzda; oyuncu kariyerleri olduğu için çıkarılmadı.

### Kadro Kur

Kural motoru, sunucu odası, bot ve uygulama ekranı yazıldı. Ekran: skor tablosu (toplam asist) ve sayaç, turun kulübü, iki tarafın kadrosu yan yana saha dizilişiyle (forvet üstte, kaleci altta), "Futbolcu seç" ile açılan arama. Seçilen futbolcu görseli, soyadı ve asist sayısıyla yuvaya oturuyor; rakibin seçimi anında görünüyor.

Ortak altyapıda değişenler: oturum mesajları birden fazla mod taşıyacak biçimde genelleştirildi (`session` ve `view` mesajlarında mod alanı); arama penceresi konsept ya da kulüp ve mevki süzgeci alabiliyor; ana ekrandaki oyun seçimi yana kayan bir sıraya dönüştü.

Doğrulama: gerçek veritabanıyla sunucu testinde bota karşı tam maç; emülatörde bota karşı tam maç (Manchester City turunda De Bruyne 261, Barcelona turunda Messi 368 asist; iki tur süre dolmasıyla boş geçti; sonuç 629–517).

Emülatörde bulunan ve düzeltilen sorunlar: dört basamaklı skorlar rakibin adını sığmaz hâle getiriyordu (Kadro Kur'da skor tablosu küçük rakam kullanıyor); "Kevin De Bruyne" yuvada "Bruyne" görünüyordu (soyadı ekleriyle gösteriliyor: "De Bruyne", "van der Sar").

Görsel bulgusu: Messi'nin kartındaki çizim kaynak fotoğraftaki yüzü yeterince korumuyor (kaynak kırpma doğru; çizime dönüştürme yüzü değiştiriyor). Bu, dönüştürme gücünün bütün görsellerde yarattığı genel bir risk; tanınmış oyuncuların görselleri elle gözden geçirilmeli, gerekirse kimliği koruyan bir yöntem denenmeli.

### Hangisi Yüksek ve Zincir

İki mod daha kural motoru, sunucu odası, bot ve uygulama ekranıyla eklendi; ana ekrandaki oyun sırası beşe çıktı.

- **Hangisi Yüksek.** Belgedeki "doğruysa devam eder" kuralı tek oyuncunun maçı tutabilmesine yol açacağı için eller sınırlandı: her oyuncuya 3 el, bir elde en çok 5 doğru. Ekran: soru levhası, seri göstergesi, iki büyük kart; cevaptan sonra değerler kartların altında açılıyor, doğru kart parlıyor, diğeri soluklaşıyor.
- **Zincir.** Ekran: kural levhası, geçmiş halkaların yatay şeridi (aralarında bağlayan kulüp), büyük "son halka" kartı ve "Bağlantı: Fenerbahçe" satırı. Arama penceresi açık; doğruluk sunucuda denetleniyor.

Doğrulama: ikisi için de gerçek veritabanıyla sunucu testinde bota karşı tam maç ve emülatörde bota karşı maç (Hangisi Yüksek'te soru, açılış, süre dolması, rakip sırası; Zincir'de Alpay Özalan → Rüştü Reçber → Talisca, Fenerbahçe bağlantılarıyla, sonuç ekranına kadar). Zincirin tur sırası betikle ayrıca doğrulandı.

Bulunan ve düzeltilen sorunlar:

- Zincir botu pes ederken süreyi dolduruyordu; insan oyuncu 20 saniye boşuna bekliyordu. Bot artık yanlış bir ad söyleyerek pes ediyor.
- Kadro Kur, Hangisi Yüksek ve Zincir'de maç açılışındaki ilk görünümde kalan süre 0 geliyordu; ilk süre artık selamlamada doğru gidiyor.
- Yeni bir görünüm geldiğinde sayaç bir an bir saniye fazla gösterebiliyordu; uygulama saatini görünüm gelince tazeliyor.
- Hangisi Yüksek'te cevap açılırken etiket bir sonraki eli gösteriyordu; artık cevaplanan eli ve o elin serisini gösteriyor. Kartlardaki X/O filigranı bu modda kaldırıldı.

Geliştirme ortamına özgü bir gözlem: dosya değiştirince uygulama sıcak yenilenirken bazen ikinci bir bağlantı açıyor ve ekran "Başka bir cihazda oynuyorsun" hatasına düşüyor. Yayın sürümünde sıcak yenileme olmadığı için kullanıcıyı etkilemez; yine de bağlantının bir kez kurulmasını garanti etmek üzere izlenecek.

### En Az Bilinen

Kural motoru, sunucu odası, bot ve uygulama ekranı eklendi. Ekran: ölçüt levhası (bayraklı ve büyük harf kuralına uygun "CHELSEA FC × LIVERPOOL FC"), beş turun sonuç noktaları, gizli kalan kendi cevabın, açılışta iki cevap yan yana (doğru/yanlış ve bilinirlik çubuğu).

Doğrulama: gerçek ızgaralarla sunucu testinde bota karşı tam maç (her turda en az bilinen doğru cevap); emülatörde bota karşı tam maç (Chelsea × Liverpool turunda Sturridge, bilinirlik 50, botun 73 bilinirlikli cevabına karşı turu aldı; sonuç ekranına kadar).

Düzeltilen sorun: bot bilemediği turlarda hiç cevap vermiyor, insan oyuncu 30 saniye bekliyordu; artık akla yatkın yanlış bir cevap veriyor.

### Açık Artırma

Kural motoru, sunucu odası, bot ve uygulama ekranı eklendi. Ekran: ölçüt levhası, büyük teklif sayısı (kimin teklifi olduğu), artır/azalt düğmeleri, "N isim sayarım" ve "Say bakalım"; ispatta "2/5 doğru isim" ilerlemesi ve yazılan isimlerin listesi.

Doğrulama: gerçek ızgaralarla sunucu testinde bota karşı tam maç; emülatörde bota karşı tam maç (AS Monaco × Fransa turunda bot "Say bakalım" dedi; sonuç ekranına kadar).

Düzeltilen sorunlar: bot bildiğinden fazla teklif verince ispatta isimleri bitiyor ve süre dolana kadar bekliyordu, artık hemen pes ediyor; kendi teklifinde "SEN SÖYLEDİ" yazıyordu, artık "SENİN TEKLİFİN".

### İlk 10

Kural motoru, sunucu odası, bot ve uygulama ekranı eklendi. Ekran: liste başlığı ("KARİYERİNDE EN ÇOK GOL ATAN 10 HOLLANDA FUTBOLCUSU"), iki tarafın canları, sırası ve sahibinin rengiyle dolan 10 satırlık liste, son tahminin sonucu ("Robin van Persie: 7. sırada!").

Veri kararı: millî maç listeleri, kaynağın 2012 öncesi kariyerleri kapsamaması yüzünden yanıltıcı çıktığı için kullanılmadı (Türkiye listesinde Rüştü Reçber ve Hakan Şükür yoktu).

Doğrulama: gerçek veritabanıyla sunucu testinde bota karşı tam maç; emülatörde bota karşı maç (Hollanda listesinde Robin van Persie 274 golle 7. sırada bulundu).

Aynı oturumda düzeltilen bir sorun: durum satırlarında yabancı futbolcu adları Türkçe kuralla büyütülüyordu ("ROBİN VAN PERSİE"); İlk 10, Zincir ve Kadro Kur'da adlar artık yerli/yabancı ayrımına göre büyütülüyor.

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
| `82f0857` | 7 Ekim | Emülatörde bulunan hatalar: giriş sonrası takılma, kırpılan düğme yazıları, Skia uyarıları |
| `2a39651` | 7 Ekim | Belgeler: emülatör kurulumu ve açılış hatasının kök nedeni |
| `5a5203a` | 7 Ekim | Ortak futbol sorguları paketi |
| `fc6cf3d` | 7 Ekim | Sunucuda online maç: maç odası, eşleştirme, bot, maç kaydı |
| `2011c7c` | 7 Ekim | Uygulamada online maç, arkadaş odası ve maç geçmişi |
| `c157ce9` | 7 Ekim | Belgeler: online maç ve arkadaş odası |
| `a6cb610` | 7 Ekim | Görsel hattı: Commons fotoğrafından çizim |
| `0062178` | 7 Ekim | Sunucuda görsel dosyalarının sunulması |
| `2ed7bec` | 7 Ekim | Kartlarda görsel ve "Görsel kaynakları" ekranı |
| `b52c4f6` | 7 Ekim | Adın diline göre büyük harf, kartta tam ad |
| `7fc5278` | 7 Ekim | Görsel hattında kırpmanın sağlamlaştırılması |
| `9f85847` | 7 Ekim | Belgeler: görsel hattı ve kararları |
| `490dc7b` | 7 Ekim | Sunucu paketleme dosyası ve barındırma seçenekleri |
| `51ef979` | 7 Ekim | Tek görsel hata verince üretimin sürmesi |
| `7e61dc9` | 7 Ekim | Üretilen 1.232 görselin kaynak kayıtları (uygulama veritabanı) |
| `e48d9b6` | 7 Ekim | Belgeler: görsel üretiminin sonuçları |
| `09caf5d` | 7 Ekim | Kariyer istatistikleri (ikinci açık veri seti ve Vikiveri), oyun modları planı |
| `ebc4b81` | 7 Ekim | Piyasa değeri ve millî maç sayısının uygulama veritabanına eklenmesi |
| `40a0f08` | 7 Ekim | Kart Düellosu kuralları (kural motoru) |
| `cb9507a` | 7 Ekim | Kart Düellosu mesajları ve ortak veri ifadeleri |
| `7fa425b` | 7 Ekim | Sunucuda birden fazla mod: oda üreticileri, Kart Düellosu odası ve botu |
| `16e17b1` | 7 Ekim | Düello sürelerinin protokolde paylaşılması |
| `bb4a295` | 7 Ekim | Uygulamada konsepte göre futbolcu arama |
| `8c54ca2` | 7 Ekim | Uygulamada Kart Düellosu ekranları ve oyun seçimi |
| `58266d0` | 7 Ekim | Belgeler: mod altyapısı ve Kart Düellosu |
| `7058d57` | 7 Ekim | Kadro Kur kuralları (kural motoru) |
| `71a9a5e` | 7 Ekim | Kadro Kur mesajları ve ortak veri ifadeleri; çok modlu oturum mesajları |
| `428499b` | 7 Ekim | Sunucuda Kadro Kur odası ve botu |
| `4f8682f` | 7 Ekim | Uygulamada Kadro Kur ekranı ve kaydırılabilir oyun seçimi |
| `d514ad6` | 7 Ekim | Belgeler: Kadro Kur |
| `181cb42` | 7 Ekim | Hangisi Yüksek kuralları (kural motoru) |
| `54669f3` | 7 Ekim | Hangisi Yüksek mesajları |
| `4ac9a1a` | 7 Ekim | Sunucuda Hangisi Yüksek odası ve botu |
| `1896ad5` | 7 Ekim | Hangisi Yüksek'te açılış sırasında doğru el ve seri |
| `7f32ffb` | 7 Ekim | Uygulamada Hangisi Yüksek ekranı |
| `9efe187` | 7 Ekim | Zincir kuralları (kural motoru) |
| `3fcda0a` | 7 Ekim | Zincir mesajları ve ortak veri ifadeleri |
| `32b5af9` | 7 Ekim | Sunucuda Zincir odası ve botu |
| `0051e46` | 7 Ekim | Yeni modlarda ilk sürenin selamlamada doğru gitmesi |
| `b14068f` | 7 Ekim | Uygulamada Zincir ekranı |
| `36b1d1f` | 7 Ekim | Belgeler: Hangisi Yüksek ve Zincir |
| `5f80220` | 7 Ekim | En Az Bilinen kuralları (kural motoru) |
| `ed7dba7` | 7 Ekim | En Az Bilinen mesajları ve ortak veri ifadeleri |
| `79eb598` | 7 Ekim | Sunucuda En Az Bilinen odası ve botu |
| `eeef981` | 7 Ekim | Uygulamada En Az Bilinen ekranı |
| `251e6c3` | 7 Ekim | Belgeler: En Az Bilinen |
| `a04c987` | 7 Ekim | Açık Artırma kuralları (kural motoru) |
| `df47a2d` | 7 Ekim | Açık Artırma mesajları ve ortak veri ifadeleri |
| `1aece96` | 7 Ekim | Sunucuda Açık Artırma odası ve botu |
| `e46e6d3` | 7 Ekim | Uygulamada Açık Artırma ekranı |
| `9d5b609` | 7 Ekim | Belgeler: Açık Artırma |
| `3a74d81` | 7 Ekim | İlk 10 kuralları (kural motoru) |
| `bb99de2` | 7 Ekim | İlk 10 mesajları ve liste sorguları |
| `7eeddd6` | 7 Ekim | Sunucuda İlk 10 odası ve botu |
| `fe49019` | 7 Ekim | Uygulamada İlk 10 ekranı |
| `756ed64` | 7 Ekim | Zincir ve Kadro Kur mesajlarında adların doğru büyütülmesi |
