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

### Kariyer Yolu ve dokuz modun tamamlanması

Veri: tam veritabanındaki tarihli kulüp kayıtları (`player_clubs.first_year`, `last_year`) uygulama veritabanına `player_club_years` tablosu olarak eklendi (120.989 kayıt). Kaynakta 15 kayıtta ayrılış yılı katılış yılından önce görünüyordu; bu kayıtlarda ayrılış yılı boş bırakılıyor. Tanınmış (bilinirliği 45 ve üzeri) 972 oyuncunun 937'sinde bütün kulüplerin katılış yılı biliniyor. Uygulama bu tabloyu kullanmadığı için veri sürümü değişmedi; tabloyu sunucu okuyor.

Kariyer Yolu: kural motoru, sunucu odası, bot ve uygulama ekranı eklendi. Ekran: "Kim bu futbolcu?" levhası ve şu anki puan, yıllarıyla açılan kulüp listesi, tur sonunda futbolcunun kartı. Emülatörde bota karşı denendi (FC Metz → AS Monaco ile başlayan 9 kulüplü bir kariyer; ardından Inter → Real Madrid). 9 kulüplü kariyerin ekranı neredeyse doldurduğu görülünce gizli futbolcular 3–8 kulüplü kariyerlerle sınırlandı.

Böylece planlanan dokuz modun hepsi online (bot ve arkadaş odası dahil) oynanır durumda. Bütün modlarda ortak olan karar: bot "bilemediği" durumda süreyi doldurmak yerine akla yatkın yanlış bir cevap veriyor; insan oyuncu boşuna beklemiyor.

### İlk geri bildirim düzeltmeleri

Kullanıcının dokuz modu denedikten sonraki listesi:

- **"Maç kurulamadı" hatası.** Sebep, geliştirme sırasında API sunucusunun durdurulmuş olmasıydı; sunucu yeniden açıldı ve betikle 9 mod × 3 zorluğun hepsinde maç kurulduğu doğrulandı. Hata ekranına "Tekrar dene" düğmesi eklendi; sunucuya ulaşılamıyor mesajı bağlantıyı kontrol etmeyi öneriyor.
- **Her modda bota karşı.** Protokole `play-bot` mesajı eklendi: sunucu sıraya sokmadan "Bot" adlı rakiple maçı hemen açar (maç kaydında tür `bot`). Ana ekranda "Bota karşı" kartı artık her modda var; XOX'ta eskisi gibi internetsiz oynanıyor.
- **İki kişilik mod kaldırıldı.** XOX'taki "İki kişi" (aynı telefonda sırayla) girişi ve ona ait metinler silindi; yerel maç yalnızca bota karşı.
- **Soru tekrarı.** Kart Düellosu'nda 14 kartın hepsinde bilinen ölçüt 7'den az olunca sorular baştan dönüyordu. Artık 7 soru hep farklı; eksik kalırsa en çok kartta bilinen ölçütler ekleniyor (değeri bilinmeyen kart o soruda kaybeder). Asist ve sarı kart verisi olmayan oyuncular çoğunlukla eski yıldızlar (Maradona, Hagi, Metin Oktay); onları havuzdan çıkarmak yerine bu yol seçildi. Hangisi Yüksek'te soru türleri sırayla dönüyor; yedisi sorulmadan biri tekrar gelmiyor, aynısı art arda gelmiyor. Diğer modlarda aynı maçta birebir tekrar yoktu (her tur farklı hücre, liste ya da futbolcu).
- **Oyun seçimi ortalanıyor.** Ana ekrandaki yatay listede seçilen oyun ekranın ortasına kayıyor (kenardakiler için mümkün olduğu kadar).
- **Kart seçerken seçilenler görünüyor.** Kart Düellosu'nun arama penceresinde alttaki "Tamam (x/7)" yazısının üstünde seçilen kartlar ve boş yerler küçük kartlar olarak duruyor; düğme yalnızca "Tamam".
- **Arama sonuçlarında bayrak yok.** Uyruğu bilmek bazı modlarda (XOX'ta ülke başlığı, En Az Bilinen, Açık Artırma) cevabı ele veriyordu; arama satırında artık yalnızca mevki, ad ve doğum yılı var.
- **Metin dili.** Kendi adımızın "Sen" olarak üçüncü şahıs kalıplarına girdiği yerler düzeltildi: Açık Artırma'da "Sen saydı" yerine "Saydın!" / "Sayamadın", rakip için "Rakip saydı"; son teklif "Senin teklifin" / "Rakibin teklifi"; XOX'ta "Sıra: Sen" yerine "Sıra sende" / "Sıra rakipte". Sonuç alt satırları ("Üç turu ilk alan kazandı" gibi) ve bazı mod açıklamaları daha anlaşılır yazıldı.

Doğrulama: 152 sunucu ve 88 uygulama testi; betikle 27 bot maçının hemen kurulması; emülatörde ana ekran (ortalama, her modda Bota karşı kartı), düelloda bota karşı maçın beklemeden açılması, bayraksız arama satırı ve kart tepsisi, XOX'ta "Sıra sende". Emülatör bu oturumda birkaç kez kendiliğinden kapandı; tepsinin dolu hâli ve Açık Artırma'nın yeni metinleri ekranda görülemedi.

### Puan, seviye, gol ve geçmiş ekranı

Kullanıcının isteği: rekabet hissi için her oyuncunun puanı, puana yakın rakiple eşleşme, puandan seviye, her gün girişte ödül, ayrıntılı geçmiş ve istatistik ekranı, maçtan çıkarken uyarı. İş ortasında mekanizma netleşti: puanın yanında ayrı bir para birimi olarak **gol** olacak; günlük ödül ve galibiyet gol verir, ileride satın alma ve ödüllü reklamla da gol kazanılacak. Kararlar (seçenekli sorularla):

- Her oyunun ayrı puanı ve bir toplam puan; seviye toplam puandan.
- Yalnızca online sıra maçları puanlı (gizli bot dahil); "Bota karşı" ve arkadaş odası puansız.
- Yeni hesaba 15 gol; günlük ödül 1'den 5'e artan seri; puanlı galibiyet 1 gol.

Sunucu: Elo biçiminde puan değişimi (zorluk kazancı artırır, puan sıfırın altına inmez), oyun başına puan tablosu, gol cüzdanı ve kayıt defteri (aynı maç ya da gün için ikinci kez gol yazılamaz), günlük seri, puana yakın rakip seçen ve bekledikçe aralığı genişleyen eşleştirme, `GET /progress`, `POST /daily`, `GET /wallet`, süzülüp sayfalanan `GET /matches`. Maç bitince her oyuncuya kendi puan değişimi, yeni seviyesi ve kazandığı gol gider.

Uygulama: ana ekranda seviye, toplam puan ve gol rozeti, seçili oyundaki puan, günde bir kez günlük ödül penceresi; maç sonunda puan değişimi, gol ve seviye atlama; geçmiş ve istatistik ekranı; süren maçtan çıkarken (çık düğmesi ya da Android geri tuşu) "Maçı terk edersen mağlup sayılırsın" onayı. Puanlı maçta uyarıya "bu oyundaki puanın düşer" eklenir.

Doğrulama: 168 sunucu ve 90 uygulama testi; geliştirme sunucusunda yeni hesapla günlük ödül ve cüzdan; emülatörde günlük ödül penceresi, ana ekran rozeti, XOX'ta ve puanlı düelloda çıkış onayı (Android geri tuşu dahil), puanlı düellonun sonuç ekranı ("0 PUAN", "Bu oyundaki puanın: 0"), geçmiş ekranının tüm bölümleri. Galibiyette görünen gol rozeti ve seviye atlama damgası emülatörde görülmedi; sunucu testleri kapsıyor.

Bu sırada yaşanan bir sorun: geliştirme sunucusu dosya değişince kendini yeniden başlattığı için yeni veritabanı geçişinin yarım bir ara hâlini yerel geliştirme veritabanına uyguladı. Geçiş henüz gönderilmemişti; yerel veritabanının yedeği alınıp yalnızca o adım geri alındı ve tam hâli yeniden uygulandı.

### Gol kararları ve jokerler

Kullanıcıya seçenekli sorularla soruldu ve karara bağlandı: gol yalnızca maç içi jokerde harcanır; misafir hesap gol satın alamaz, önce hesap açar; ödüllü reklam başına 2 gol, günde en çok 5; paket fiyatları mağaza hazırlığına kaldı. Jokerler moda özel; joker 3 gol, maçta en çok 2, puanlı maçlarda da geçerli. Önerilen dokuz modluk joker listesi onaylandı (liste [oyun-modlari.md](oyun-modlari.md) belgesinde).

Sunucu: protokolde joker tipleri ve `joker` mesajları; lobide sıra, bakiye ve iki joker sınırı denetimi; gol ancak oda jokeri uyguladıktan sonra düşer; dokuz odanın her birinde iki joker (süre uzatma, can, pas, kart değişimi ve gizli bilgiler). Kariyer Yolu için futbolcunun uyruk, mevki ve doğum yılını veren ortak bir sorgu eklendi.

Uygulama: her online maçta skorun altında joker çubuğu (XOX'ta arama penceresinde, Kart Düellosu'nda elin altında); açılan bilgi yerel veritabanından adlarla metne çevrilir (ipucunda yalnızca baş harfler) ve o tur boyunca görünür; rakibin jokeri ayrı satırda; Kadro Kur'da "Asistleri gör" sonrası arama sonuçlarında asist sayıları.

Doğrulama: 180 sunucu ve 92 uygulama testi; emülatörde puanlı Kariyer Yolu maçında "Uyruk: İngiltere" ve "Mevki: Forvet · 2000 doğumlu" (hak 0'a indi, gol 16'dan 10'a düştü), puanlı XOX maçında arama penceresinde "+15 saniye eklendi" ve "İpucu: L. P. · 1994". Emülatörde açılan bilginin bir sonraki futbolcuda da kalacağı görüldü; bilgi o tur ya da soruya bağlandı.

### Lider tablosu ve günün bulmacası

Seçenekli sorularla verilen kararlar: lider tablosu haftalık ve tüm zamanlar; bulmacada 9 hak ve nadirlik puanı; bitirene 2 gol, 9/9 yapana +3 gol, günün sıralaması ayrı.

Sunucu: `GET /leaderboard`, `GET /puzzle`, `POST /puzzle/guess`, `GET /puzzle/ranking`; bulmaca tabloları (`puzzle_plays`, `puzzle_answers`); gün ve hafta sınırları saat dilimine göre. Puan formülü ilk çözeni cezalandırmayacak biçimde seçildi: hücreyi tek başına dolduran 100 alır. Emülatörde bakarken görülen bir hata düzeltildi: bulmacayı yalnızca açmak "oynadı" kaydı açıyordu ve ana ekrandan bakan herkes sıralamaya 0 puanla giriyordu; kayıt artık ilk tahminde açılıyor.

Uygulama: ana ekranda bulmaca ve lider tablosu kutucukları; lider tablosu ekranı (dönem, genel ve oyun seçimi, ilk üç için madalya renkleri, kendi sıran); bulmaca ekranı (XOX tahtası, dolu kartta aynı cevabı verenlerin oranı, hak noktaları, bitiş özeti, gol ödülü, paylaşma, günün sıralaması). Arama penceresi artık saatsiz de açılabiliyor.

Doğrulama: 189 sunucu ve 93 uygulama testi; geliştirme sunucusunda gerçek veriyle uçlar; emülatörde ana ekran kutucukları, bulmacada Bayern Münih × Real Madrid için Toni Kroos ("%100", 100 puan), hakların bitmesiyle bitiş özeti ("+2 gol kazandın"), günün sıralaması ve haftalık lider tablosu.

### Uçtan uca kullanıcı testi

Yeni bir hesapla (test_kaan) emülatörde bütün uygulama kullanıcı gözüyle denendi: tanıtım, karşılama, kayıt ve giriş, günlük ödül, dokuz modun bota karşı maçı, puanlı online maç, betikle bağlanan ikinci oyuncuyla arkadaş odası, geçmiş, lider tablosu, günün bulmacası (bitiş ve paylaşma dahil), misafirin aynı hesaba dönmesi, sunucu kapalıyken maç kurma ve "Tekrar dene". 25 bulgu not edildi; uygulama içinde çözülebilenler düzeltildi:

- **Kesilen eğik yazılar.** Android, eğik başlık yazı tipini içeriğe göre genişleyen kutularda dar ölçüyor; son kelime görünmeyen ikinci satıra düşüyordu ("SV 1" yerine "SV", "İLK 10" yerine "İLK", "42 – 7" yerine "42 –"). `ThemedText` bu yazı tipinde boşluk içeren metnin sonuna bir boşluk ekleyerek pay bırakıyor.
- **Oyuncu hep solda.** Oyuncu O olduğunda skor tablosunda sağda duruyor, sonuç ekranı "2 – 1 KAYBETTİN" gibi rakibin skoruyla başlıyordu. Bütün modlarda oyuncunun paneli, kartı, kadrosu, cevabı ve canları solda; sonuç skoru oyuncunun skoruyla başlıyor (geçmiş ekranıyla aynı).
- **Puansız maç notu.** Bota karşı ve arkadaş maçlarının sonucunda "Puansız maç · Puan ve gol yalnızca Online maç eşleşmelerinde kazanılır" yazıyor.
- **Açık Artırma.** İspatta her doğru isimden sonra arama penceresi kapanıyordu; artık ispat boyunca açık kalıyor ve doğru/yanlış isimler pencerenin altında da görünüyor. Kurala süre dolunca "Say bakalım" denmiş sayıldığı eklendi.
- **İlk 10.** Joker çubuğu eklenince durum satırı (isabet, ıska, sıra) listenin altında sıkışıp görünmez olmuştu; liste artık küçülüp kaydırılıyor, uzun kulüp adlı başlık üç satıra sığıyor.
- **Günlük ödül.** Ödül yalnızca cihazın günü değişince ve ana ekran odaklanınca isteniyordu; uygulama arka plandan dönünce ya da aynı oturumda hesap değişince hiç istenmiyordu. Ana ekran her görünüşünde ve uygulama öne geldiğinde sunucuya soruyor; sunucu günde bir kez veriyor.
- **Sunucuya ulaşılamayınca.** "Bağlanıyor" ekranı bir dakikadan uzun bekliyordu. Hiç bağlanılamamışsa iki kısa denemeden sonra vazgeçiliyor; 8 saniyede hazır olmayan bağlantı kopmuş sayılıyor.
- **Arkadaş odası.** Maç sonunda "Ana sayfa" arkadaş ekranına dönüyordu, artık ana ekrana gidiyor. Oda kodu ekranında "Kodu paylaş" düğmesi ve odanın oyunu var.
- **Arama penceresi.** Giriş alanına açılışta güvenilir biçimde odaklanıyor, seçimden sonra odak kalıyor; pencere süre dolup kapanınca klavye ekranda kalmıyor.
- **Küçükler.** XOX'ta botun doğru cevabı yeşil "DOĞRU!" yerine altın "RAKİP BİLDİ"; giriş ve kayıt formlarında yazmaya başlayınca eski hata kayboluyor; "Şifre aşağıdaki kurallara uymuyor" yerine "Şifre kurallara uymuyor" (kurallar üstte); hesap ekranında "Henüz maç yok"; gol 3'ün altına inince joker çubuğunun altında "Joker 3 gol, sende 2 gol var".

Karar bekleyen üç konu seçenekli soruldu. Tanıtım yenilendi: üç sayfa artık dokuz oyunu, puan, seviye ve lider tablosunu, gol ve jokerleri anlatıyor; karşılamadaki XOX kuralı yerine genel bir cümle var; ilk günlük ödül penceresinde "Hoş geldin hediyesi: +15 gol" ve golün joker için harcandığı yazıyor (sunucu, hesabın ilk günlük ödülünde `welcomeGoals` alanını gönderiyor). Yüzü başka birine dönen çizimler (Arda Güler, Arthur) şimdilik kalıyor. Kart Düellosu'nda iki elde aynı futbolcunun olabilmesi bilinçli olarak kalıyor (karşılaşırlarsa tur berabere).

Doğrulama: 189 sunucu ve 97 uygulama testi; düzeltmeler emülatörde tek tek denendi (İlk 10'da "LIONEL MESSI LİSTEDE YOK" satırı, Açık Artırma'da açık kalan pencere ve üstü çizili isimler, arkadaş maçından ana ekrana dönüş, ikinci günün +2 gol penceresi, joker uyarısı).

### Gizli güç puanı

Kullanıcı başlangıç puanını 1000 yapmayı önerdi. Sıfırdan başlayıp eksiye inememek puanı bozuyordu: sıfırdaki oyuncu kaybedince bir şey kaybetmiyor ama rakibi kazanıyordu (sisteme sürekli puan giriyordu), kayıp oyuncunun puanıyla sınırlıydı ve yeni oyuncuların hepsi sıfırda toplandığı için eşleştirme dipte işlemiyordu. Tek sayıyı 1000'den başlatmak ise herkesi 13. seviyeden başlatır ve ilk mağlubiyetlerde seviye düşürürdü. Seçenekli soruyla iki ayrı sayıya karar verildi: gizli güç puanı (her oyunda 1000'den, klasik Elo, eşleştirme ve gizli bot buna göre) ve görünen puan (0'dan; galibiyet rakibin gücüne göre, eşit güçte +25; mağlubiyet −10; ulaşılan seviye hiç düşmez).

Sunucu: `ratings` tablosuna `rating` sütunu (geçiş 6, mevcut kayıtlar 1000); `ratingChange`, `pointsChange` ve seviye eşiğini koruyan `keepLevel`; lobi ve koltuklar puan yerine güç puanı taşıyor. Tanıtımın puan sayfasına seviyenin düşmediği eklendi.

Doğrulama: 192 sunucu testi (eşit güçte ±20 güç ve +25/−10 puan, güçsüzün beraberlikte kazanması, seviye eşiğinde kaybın kesilmesi, herkesin 1000 ile başlaması, güce göre eşleştirme); yerel veritabanında geçiş uygulandı.

### Oyun dengesi

Her mod ve zorlukta 100'er bot–bot maçı oynatan bir ölçüm betiği yazıldı (sanal saatle, gerçek veritabanıyla; depoya girmedi). Bulgular: hiçbir modda başlayan tarafın anlamlı avantajı yok; En Az Bilinen'de maçların %16–30'u, XOX kolayda %18'i, Kart Düellosu'nda %11–17'si berabere; maçlar çoğunlukla 1–2,5 dakika, Zincir zorda ortalama 3,5 dakika. Koddan görülenler: bot seviyesi bütün oyunlardan ve arkadaş maçlarından karışık son beş maça bakıyordu; online sıra 9 oyun × 3 zorluk = 27 parçaya bölünüyordu; bazı süreler telefonda isim yazmaya dardı.

Seçenekli sorularla verilen kararlar ve yapılanlar:

- **Bot seviyesi.** Hedef, oyuncunun bota karşı kazanma oranı: Kolay %65, Orta %50, Zor %35, gizli botta %50. Seviye lobide, aynı oyundaki son beş bot maçına göre hedefin ±0,2 dışına çıkınca bir kademe kayıyor; odaya veriliyor ve maç kaydına yazılıyor (`bot_level`, geçiş 7). Ayarlar beta verisiyle bu hedeflere çekilecek.
- **Sıra.** Zorluk korunuyor; aynı zorlukta rakip yoksa 3 saniye sonra komşu zorlukla eşleşiliyor, sorular düşük olanın zorluğunda. Kolay ile Zor eşleşmiyor.
- **Süreler.** Zincir'in en kısa turu 8 → 12 sn; Açık Artırma ispatı 8 + 5/isim → 10 + 7/isim; Kariyer Yolu turu 15 → 20 sn. Bot–bot maç süreleri değişmedi (botlar süre dolmadan oynuyor); pay yalnızca insana.
- **En Az Bilinen.** Kullanıcının kararıyla şimdilik kaldırıldı. Kod ve testleri duruyor; protokolde `PAUSED_GAME_IDS`, sunucu bu modu kabul etmiyor, uygulama listelerde göstermiyor. Tanıtım ve karşılamadaki oyun sayısı listeden geliyor ("8 oyun").

Doğrulama: 197 sunucu, 66 kural motoru ve 97 uygulama testi (hedefe göre bot seviyesi, aynı oyunun bot maçları, kayıtta bot seviyesi, komşu zorlukla eşleşme, Kolay–Zor ayrımı, aynı zorluğun önceliği, kapalı mod). Emülatör kapalı olduğu için bu turdaki arayüz değişiklikleri (oyun listesi, "8 oyun") ekranda denenmedi.

### Yayın hazırlığı: ChallengeGoal

Uygulamanın adı **ChallengeGoal**, paket kimliği `com.challengegoal.app` oldu. Kullanıcı yayın adımlarını belge olarak değil sohbette adım adım istedi; hesap ve onay gerektiren işleri kendisi yaptı (Apple Developer, App Store Connect kaydı ve anahtarları, Google Cloud istemci kimlikleri, Firebase, Contabo sunucusu, alan adı). `challengegoal.com` bir satıcıda olduğu için `challengegoal.app` alındı.

Yapılanlar:

- **Kimlik ve ikon.** Uygulama adı, paket kimlikleri, karşılama ekranında marka adı; yarısı altın yarısı mavi top ve neon çizgiden oluşan ikon (`data/branding/icons.py` ile üretiliyor).
- **Derleme.** EAS projesi ve profilleri; ilk Android ve iOS derlemeleri başarıyla bitti (uygulama iOS için ilk kez derlendi).
- **Canlı sunucu.** Contabo'da güvenlik sıkılaştırması, Docker Compose, Caddy ile TLS, günlük yedek, 90 günlük günlük saklama; `api.challengegoal.app` çalışıyor, 1.232 görsel yüklendi. İstek sınırı gerçek adresi görsün diye sunucu vekile güveniyor (`TRUST_PROXY`).
- **Yasal sayfalar.** Gizlilik politikası ve KVKK metni, kullanım koşulları, hesap silme sayfası `challengegoal.app` üzerinde. Taslaktır; kullanıcının ve mümkünse bir hukukçunun onayını bekliyor.
- **Hesap silme.** Uygulamada ve sunucuda; rakip geçmişinde ad "Silinmiş oyuncu" oluyor.
- **Google ve Apple ile giriş.** Giriş ve kayıt ekranlarında; yeni hesap ilk girişte kullanıcı adını bir kez seçiyor (seçenekli soruyla karar verildi; e-postadan ad üretmek e-postanın bir kısmını gösteriyordu).
- **Bildirimler.** Kullanıcının isteğiyle plana eklendi; dört bildirimin dördü de seçildi (günün bulmacası, haftalık sonuç, seri hatırlatması, geri dönüş). Sunucuda zamanlayıcı ve Expo bildirim servisi, uygulamada izin, kayıt ve dokununca yönlendirme.

Kalanlar: şifre sıfırlama, ödüllü reklam, Apple jetonunun silmede iptali, mağaza sayfaları ve formlar. (Google'ın 12 kişilik 14 günlük kapalı test şartı bu uygulama için geçerli değil: Play hesabı şirket hesabı.)

Doğrulama: 208 sunucu ve 103 uygulama testi; canlı sunucuda sağlık ucu, misafir hesap açma, Google ucunun açık olduğu, görsellerin ve sayfaların sunulduğu denendi. Yeni özellikler telefonda henüz denenmedi (emülatör kapalı, deneme derlemesi sırada).

### Gol satın alma

Kullanıcı dört paketi seçti (30 gol ₺39,99; 100 gol ₺99,99; 250 gol ₺199,99; 600 gol ₺399,99), ilk alışa özel teşvik istemedi. Ürün kimlikleri `goals_cg_30`, `goals_cg_100`, `goals_cg_250`, `goals_cg_600`; App Store Connect'te taslak olarak açıldı.

- **Sunucu.** `POST /purchases` satın almayı mağazanın kendisine sorar (App Store Server API, Google Play Developer API), golü kayıt defterine bir kez yazar. Misafir satın alamaz. Aynı satın alma başka hesaba işlenmişse reddedilir, aynı hesaba ikinci kez gelirse gol eklemeden güncel bakiye döner.
- **Uygulama.** Ana ekrandaki gol sayacı artık mağazayı açıyor (seviye kısmı geçmişi açmaya devam ediyor). Mağaza ekranı fiyatları mağazadan alır, satın almayı sunucuya onaylatır, sonra işlemi kapatır. Sunucu golü yazmadan işlem kapatılmaz; yarım kalan satın alma mağaza her açıldığında yeniden denenir.
- **Anahtarlar.** Apple'ın uygulama içi satın alma anahtarı ve Google Play servis hesabı anahtarı sunucuda `/opt/challengegoal/secrets` altında; depoda değil.

Canlı anahtarlarla deneme iki şey gösterdi:

1. Apple'ın canlı ucu, uygulama henüz yayınlanmadığı için anahtarı 401 ile reddediyor; aynı anahtar sandbox ucunda kabul ediliyor. Doğrulayıcı 401'de duruyordu; mağaza incelemesi satın almayı sandbox'ta denediği için bu, incelemede satın almanın başarısız olması demekti. Artık 401'de de sandbox'a geçiyor; iki uç da reddederse "mağazaya ulaşılamıyor" dönüyor.
2. Google servis hesabı jeton alabiliyor ama Play, paket adını henüz tanımıyor ("No application was found"); ilk uygulama paketi (AAB) yüklenene kadar böyle kalacak.

İlk taslakta uygulama, sunucunun "geçersiz" dediği satın almayı da kapatıyordu. Sunucu yanılırsa oyuncu parasını ödeyip golünü alamayacağı için kaldırıldı: uygulama yalnızca gol yazıldığında ya da satın alma başka hesaba işlenmişse işlemi kapatır. Reddedilen her doğrulama sunucu günlüğüne yazılıyor.

Doğrulama: 219 sunucu ve 108 uygulama testi; canlı sunucuda satın alma ucu geçici bir hesapla iki mağaza için denendi (uydurma makbuz reddedildi, hesap silindi). Gerçek satın alma henüz denenmedi: Google'da ürünler açılmadı, Apple'da ürünler taslak.

### Ödüllü reklam: sunucu

Reklam ödülünü uygulama değil Google bildirir (AdMob'un sunucu taraflı doğrulaması): reklam bitince Google, `GET /ads/reward` adresini imzalı bir istekle çağırır. Sunucu imzayı Google'ın yayınladığı açık anahtarla doğrular, reklam biriminin bizimki olduğuna bakar, oyuncuya 2 gol yazar; günde en çok 5 reklam sayılır. Böylece uygulamayı kurcalayan biri kendine gol yazdıramaz.

Uygulama tarafı (reklamı gösterme, rıza penceresi, iOS izleme izni, mağaza ekranındaki "reklam izle" satırı) AdMob kimliklerini bekliyor; kullanıcı AdMob hesabını ve reklam birimlerini açıyor. Sunucuda reklam birimi tanımlanana kadar hiçbir istek gol yazmaz.

Doğrulama: 225 sunucu testi; canlı sunucuda uç, imzasız yoklamaya 200, sahte imzaya 400 dönüyor. Gerçek bir reklamla henüz denenmedi.

### Ödüllü reklam: uygulama ve AdMob

Kullanıcı var olan bir AdMob hesabında ChallengeGoal'ın Android ve iOS uygulamalarını ve birer ödüllü reklam birimini açtı, ikisine de sunucu doğrulama adresini yazdı. AdMob'un "URL'yi doğrula" isteği sunucu günlüğünde görüldü; Google'ın gerçek imzası bizim kodda doğrulandı.

- **Uygulama.** Mağaza ekranının üstünde "Reklam izle" satırı: reklam önceden yüklenir, izlenince uygulama sunucuya golün yazılıp yazılmadığını sorar (en çok 12 saniye), yazıldıysa bakiyeyi günceller. Misafir de izleyebilir. Reklam kütüphanesi olmayan derlemede (Expo Go) satır görünmez.
- **Rıza.** Reklam istenmeden önce Google'ın rıza akışı çalışır (Avrupa'da rıza penceresi; Türkiye'de pencere çıkmaz). Rıza seçeneği gereken oyuncuya hesap ekranında "Reklam tercihleri" bağlantısı görünür.
- **Site.** `app-ads.txt` `challengegoal.app` kökünde yayınlandı. Gizlilik politikasına bildirim anahtarı eklendi.
- **İzinler.** Ses kütüphanesi varsayılan olarak mikrofon, arka plan servisi ve iOS'ta arka plan sesi izinlerini ekliyordu; uygulama yalnızca kısa efekt çaldığı için hepsi kapatıldı. Şablondan gelen ekran üstü pencere ve depolama izinleri de çıkarıldı. Bunlar Google Play'de ek beyan ve inceleme sorusu demekti.

Kalanlar: Avrupa rıza mesajına ChallengeGoal uygulamalarının eklenmesi, iOS için IDFA açıklama mesajı (iOS derlemesine kadar bekliyor), gerçek cihazda reklamın ve golün yazılmasının denenmesi.

Doğrulama: 225 sunucu ve 113 uygulama testi; uygulama ayarının ürettiği Android izin listesi ve AdMob kimlikleri denetlendi. Reklamlı ilk derleme sırada; cihazda henüz denenmedi.

Reklamlı ilk iki derleme Gradle aşamasında düştü: `react-native-google-mobile-ads` 17.2.0'ın Android betiği `app.json`'u bulup içinde kendi kök anahtarını göremeyince tanımsız bir özelliğe erişiyor (betikte yanlış yazılmış bir değişken adı). Eklentiye `androidSdk: "classic"` verildi (betik o satırı atlıyor) ve aynı kimlikler `app.json` köküne `react-native-google-mobile-ads` anahtarıyla da yazıldı. Yerelde Android derleme ortamı olmadığı için düzeltme ancak Expo'daki yeni derlemeyle doğrulanacak.

Play Console tarafı sürüyor: kullanıcı uygulama içeriği formlarını (gizlilik, erişim, reklam, derecelendirme, hedef kitle, veri güvenliği, reklam kimliği) dolduruyor ve ilk mağazalı AAB'yi (sürüm kodu 2) dahili teste yüklüyor. Mağaza incelemecileri için `StoreReview` hesabı canlı sunucuda açıldı. `destek@challengegoal.app` için Cloudflare e-posta yönlendirmesi kuruldu; alan adının posta kayıtları yayında, deneme postasıyla teslimat henüz doğrulanmadı.

Play'de dört gol ürünü açıldı; Play'in API'sinden kimlikleri, etkin oldukları ve Türkiye fiyatları (₺39,99 · ₺99,99 · ₺199,99 · ₺399,99) doğrulandı. Play taban fiyatı vergi hariç aldığı için tutarlar KDV'siz girildi. Paket simgeleri, Play simgesi ve tanıtım görseli `data/branding/store_assets.py` ile üretiliyor.

Play imzası için yeni giriş istemcisi açılırken Google Cloud'da aynı adda iki proje olduğu ortaya çıktı: giriş istemcileri ilkinde, Firebase ve Play servis hesabı ikincisindeydi. Kullanıcı her şeyi Firebase projesinde (`challengegoal`) toplamayı seçti; eski istemciler silindi, giriş ekranı ayarı ve dört istemci (web, iOS, EAS imzalı Android, Play imzalı Android) yeniden açıldı, uygulamadaki ve sunucudaki kimlikler değiştirildi. Bu değişiklikten önceki derlemelerde Google ile giriş çalışmaz.

### Şifre sıfırlama

E-posta göndermek için Resend seçildi; kullanıcı hesabı açıp `challengegoal.app` alan adını doğruladı, anahtar sunucuda gizli dosya olarak duruyor. Gönderen adres `destek@challengegoal.app`.

- **Akış.** Giriş ekranındaki "Şifremi unuttum" bağlantısı e-postayı sorar; sunucu 6 haneli bir kod yollar. Oyuncu kodu ve yeni şifresini yazar, şifre değişir, oyuncu doğrudan giriş yapmış olur ve diğer cihazlardaki oturumları kapanır.
- **Korumalar.** Adres kayıtlı olsun olmasın cevap aynıdır (hesap var mı diye yoklanamaz); posta arka planda gönderilir ki cevap süresi de ele vermesin. Kod 15 dakika geçerli, en çok 5 yanlış deneme, dakikada bir ve günde en çok 5 kod.
- **Dil.** Posta, cihazın diline göre Türkçe ya da İngilizce yazılır.

Doğrulama: 232 sunucu ve 113 uygulama testi. Canlıda geçici bir hesapla `destek@challengegoal.app` adresine sıfırlama postası istendi; Resend isteği kabul etti, postanın kutuya düştüğünü kullanıcı teyit edecek. Ekran cihazda henüz görülmedi.

### İlk cihaz denemesi ve site

Kullanıcı reklamlı sürümü (sürüm kodu 4) telefonda denedi; mağaza ekranı ilk kez gerçek cihazda görüldü. İki sorun çıktı:

- **Fiyatlar boş, satın alma başarısız.** Play ürünleri fiyatsız geliyordu ve satın alma isteği sunucuya hiç ulaşmadı. İki olası neden: ürünlerin Play'de henüz yayılmamış olması ya da fiyatın Play'in yeni "satın alma seçeneği" alanında gelmesi. Uygulama artık fiyatı ve satın alma anahtarını bu seçenekten de okuyor; fiyat yoksa satır kapalı kalıyor ve Play'in bildirdiği durum ekrana yazılıyor. Hangi nedenin doğru olduğu sonraki denemede anlaşılacak.
- **Reklam gelmiyor.** Uygulama sunucuya ulaşıyor; takılan yer Google'ın rıza ya da reklam tarafı. Olası nedenler AdMob'da uygulamaların rıza mesajına eklenmemiş olması ve yeni birime reklam gelmemesi (test cihazı tanımlı değilse). Reklam ya da satın alma başarısız olunca artık hata kodu ekranda görünüyor; ilk denemede kod görünmediği için neden kesinleştirilemedi.

Kullanıcı sitenin çok kötü göründüğünü söyledi. `challengegoal.app` oyunun renkleri ve yazı tipleriyle baştan yazıldı: örnek XOX ızgaralı giriş, sekiz oyunun kartları, özellikler, sık sorulanlar, iletişim; İngilizce sayfa (`/en`); yasal sayfalar aynı görünüme alındı. Yazı tipleri ve görseller sitenin içinden sunuluyor (dış kaynak yok). Masaüstü ve telefon genişliğinde tarayıcıda çizdirilip bakıldı. `deploy` klasöründeki satır sonu kuralı görsel ve yazı tipi dosyalarını depoda bozuyordu; ikili dosya olarak işaretlendi.

### Yönetim paneli

Kullanıcı anlık oyuncu sayısını ve uygulama istatistiklerini görebileceği bir panel istedi. Dış bir analiz servisi yerine sunucunun içine küçük bir panel konuldu: veriler zaten kendi veritabanımızda, canlı maç bilgisi sunucunun belleğinde. Adres `https://api.challengegoal.app/admin`; yalnızca kullanıcıda duran anahtarla açılıyor. Ayrıntı teknik mimaride "Yönetim paneli" bölümünde.

Doğrulama: 240 sunucu testi; canlıda sayfa açılıyor, anahtarsız istek reddediliyor, anahtarla gelen sayılar (9 hesap, 3 maç, 6 bildirim cihazı) veritabanıyla uyumlu; sayfa bu veriyle tarayıcıda çizdirilip bakıldı.

### İkinci cihaz denemesi ve kullanıcı istekleri

Sürüm kodu 8 telefonda denendi:

- **Satın alma çalıştı.** Deneme satın alması ("Test kartı, her zaman onaylanır") Play'de onaylandı; sunucu Play'e sorup doğruladı ve 30 golü yazdı. Play ürünü fiyatsız döndürdüğü için sorunun kaynağı, fiyatın ve satın alma anahtarının Play'in satın alma seçeneğinde gelmesiydi; ürünlerin yayılma gecikmesi de etkili olmuş olabilir, ikisi ayrıştırılamadı.
- **Reklam `no-fill` dönüyor.** Rıza adımı geçiyor, istek Google'a ulaşıyor ama reklam gelmiyor. AdMob, uygulama bir mağazada yayınlanıp bağlanana ve incelenene kadar gerçek reklam gönderimini sınırlıyor. Golün reklamdan sonra yazılması ancak test cihazına gelen deneme reklamıyla sınanabilecek; henüz sınanmadı.

Kullanıcının istekleri:

- **Bağlantı ve görsel uyarısı.** Rakip bir uygulamadaki açılış notunu örnek gösterdi. Bizde kulüp logosu olmadığı için logo cümlesi alınmadı; "hiçbir kulüp, lig, federasyon ya da futbolcuyla bağlantılı değildir" ve "futbolcu görselleri yapay zekâ ile üretilmiş çizimlerdir, gerçek fotoğraf değildir" cümleleri tanıtım, karşılama ve rakip arama ekranlarına, görsel kaynakları ekranına, kullanım koşullarına ve siteye eklendi.
- **İnternet uyarısı.** Cihazın bağlantısı kesilince bütün ekranların üstünde kırmızı bir şerit çıkıyor (`expo-network`); maçtaysa 30 saniye kuralını da söylüyor.
- **Klavye.** Futbolcu arama penceresi açılınca klavye kendiliğinden gelmiyordu. Android'de pencere hazır olmadan odaklanan alan klavyeyi açmıyor, sonraki odaklama da "zaten odaklı" diye yok sayılıyordu; alan artık pencere açıldıktan sonra odaklanıyor, klavye gelmediyse bir kez daha deneniyor.
- **Yönetim paneli** ve **şirket hesabı** ayrı başlıklarda.

Bu üç değişiklik cihazda henüz denenmedi; sürüm kodu 9 derlemesiyle gelecek.

### Görsel verisini büyütme araştırması (8 Ekim 2026)

Kullanıcı portrelerin çoğunu kötü ve yetersiz buldu, kulüp arması da istedi ve rakip bir uygulamanın (Tactico) oynanış videosunu örnek gösterdi. Videodan çıkanlar: rakibin armaları gerçek logo değil, tek kalkan kalıbına kulüp renkleri, basit bir desen ve kısaltma konarak üretilmiş; portreleri hep aynı kalıpta (yalnızca baş, düz zemin); az bilinen oyuncuların da görseli var; yenilince geri sayımla "puanı koru" düğmesi çıkıp ödüllü reklamla kaybedilen puanı geri veriyor.

Ölçümler (`data/build/football.sqlite` ve Wikimedia uçları):

| Ölçüm | Sonuç |
|---|---|
| Veritabanındaki futbolcu | 72.435 |
| Wikidata'da ana fotoğrafı (Commons) olan | 22.553 (%31) |
| Şu anki hedef (bilinirlik 32+) | 1.889 oyuncu; 1.665'inin fotoğrafı var, 1.232 portre üretildi |
| Bilinirlik 25+ | 4.661 oyuncu, 4.203'ünün fotoğrafı var |
| Bilinirlik 20+ | 13.165 oyuncu, 10.783'ünün fotoğrafı var |
| Lisans eleği | 1.665 fotoğrafın 18'i serbest değil |
| Yüz eleği (1.647 fotoğraf) | 1.169 uygun; 242 "dar kadraj", 119 yüz yok, 68 profilden, 49 kalabalık |
| Ana fotoğrafı olmayanlarda başka Commons dosyası | 120 kişilik örneklemde 5 (%4) |
| Kulüp renkleri, Wikidata "resmî renk" | 219 kulübün 122'sinde; adlar doğru, renk kodları genel (sarı = FFFF00), desen yok |
| Kulüp renkleri, Wikipedia forma şablonu | 177 kulüpte gövde rengi var ama çoğu sezonluk desen görselinin altındaki zemin; güvenilir değil |

Sonuçlar:

- Portre sayısını sınırlayan fotoğraf yokluğu değil, hedef eşiği. Aynı serbest lisanslı kaynakla eşik düşürülerek portre sayısı birkaç katına çıkarılabilir.
- "Dar kadraj" yüzünden elenen fotoğraflar, rakipteki gibi yalnızca başı alan kesimle kullanılabilir hâle gelir.
- Ana fotoğrafı olmayan oyuncular için Commons'ta başka dosya aramak verimsiz; onlara portre yerine çizim avatar gerekir.
- Arma renkleri için otomatik kaynaklar yetersiz; 219 kulüp elle derlenip denetlenecek kadar az.
- Telifli fotoğraf kaynaklarından (ör. Transfermarkt, ajans fotoğrafları) üretim yapılmayacak.

### Armalar, puan koruma ve yeni portre tarzı

- **Armalar.** 219 kulübün renk, desen ve kısaltma tablosu elle derlendi; armalar kalkan kalıbından üretilip XOX başlıklarına, Kariyer Yolu, Zincir ve Kadro Kur ekranlarına kondu. Bütün armalar tarayıcıda tek sayfada çizdirilip gözden geçirildi. Uygulamadaki Skia çizimi cihazda henüz görülmedi.
- **Puan koruma.** Kullanıcı sınırsız olmasını seçti. Sunucu tarafı canlıda; uygulama tarafı sonraki derlemede. Reklam `no-fill` döndüğü için düğme ancak deneme reklamı gelirse görünür; uçtan uca denenmedi.
- **Portreler.** 15 tanınmış oyuncuyla deneme yapıldı: yalnızca baş, fotoğrafa yakın boyama. Eski tarzda tanınmayan Ronaldo, Messi ve Arda Güler'in yanında yeni tarzda benzerlik belirgin biçimde arttı; kullanıcı beğendi ve "aslına yakın" tarzı, bilinirlik 20+ kapsamını seçti. Hız görsel başına 3,7 saniye. Provada çıkan sorunlar (omuzların ve yakaların kadraja girmesi, kopuk el) baş sınırı daraltılarak ve kopuk parçalar atılarak giderildi; başı öne eğik pozlarda yaka kalıntısı ve arkada başka biri olan fotoğraflarda ikinci baş hâlâ çıkabiliyor. Bulanık kaynaklar eleniyor (ilk 24 oyuncuda 1). Toplu üretim 8 Ekim 21.52'de başlatıldı; eski tarzdaki 1.232 görsel `data/build/portraits-comic` altına alındı. Üretim bitince `export` ayrıca çalıştırılacak: veri sürümünü değiştirdiği için uygulama derlemesiyle birlikte yapılmalı.
- **Google ile giriş.** Yeni kimliklerle derlenen sürümde "giriş tamamlanamadı" çıktı. Sunucuya istek gelmediği için hata cihazda, Google'ın penceresinde; en olası neden Play imzasıyla eşleşen Android istemcisinin eksik ya da yanlış olması. Kullanıcı Google Cloud'da denetleyecek; sonraki derleme hata kodunu gösterecek.
- **Derleme kuralı.** Kullanıcı, onayı olmadan Expo'ya derleme gönderilmemesini istedi; kuyruktaki derleme iptal edildi.

### Üçüncü cihaz denemesi, kart yerleşimi ve mağaza metinleri

- **Google ile giriş.** Sorun Google Cloud'daki istemci ayarındaymış; kullanıcı düzeltti. Canlı veritabanında Google ile açılmış 3 hesap var.
- **Ödüllü reklam.** Telefon AdMob'da deneme cihazı olarak eklenince reklam geldi; sunucu bildirimi doğrulayıp 2 golü yazdı. Uygulama mağazada yayımlanana kadar gerçek reklam gelmeyecek (`no-fill`).
- **Armalar.** Kullanıcı tarayıcı önizlemesindeki 219 armayı onayladı.
- **Kart yerleşimi.** Yeni portreler yalnızca baş olduğu için eski "üst gövde, kartın altına taşan" yerleşim uymuyordu. Altın ve mavi kart üzerinde deneme görseli çıkarıldı (`data/build/portrait-review/card-mock.jpg`); arkaya zemin dairesi koymadan, başı kartın sağ üstüne `contain` ile oturtmak seçildi. Zincir düğümleri ve Kadro Kur yuvaları da kare ve `contain` oldu. Cihazda henüz görülmedi.
- **Mağaza metinleri.** Türkçe ve İngilizce ad, kısa açıklama, tam açıklama, App Store alt başlığı ve anahtar kelimeleri `docs/magaza-metinleri.md` dosyasına yazıldı; hepsi karakter sınırlarının içinde (betikle sayıldı). Ekran görüntüleri yeni portre ve armaları içeren derlemeden alınacak.
- **Portre üretimi.** 22.28'de hâlâ indirme aşamasında: 10.783 kaynak fotoğrafın 3.873'ü inmişti (dakikada yaklaşık 65).

### Apple jetonunun iptali

- Hesap silinince "Apple ile giriş" jetonu artık iptal ediliyor (App Store incelemesinin şartı). Uygulama girişte yetki kodunu da gönderiyor; sunucu yenileme jetonunu saklıyor ve silmede iptal ediyor.
- Anahtar (`AuthKey_AAGV57MPNC.p8`) sunucunun gizli klasörüne kondu, `.env` dosyasına üç ayar eklendi, sunucu dağıtıldı; 14. veritabanı geçişi canlıda uygulandı.
- Anahtar Apple'a karşı sınandı: uydurma bir kodla `auth/token` "kod geçersiz" (`invalid_grant`) yanıtı verdi, yani istemci gizlisi kabul ediliyor (reddedilseydi `invalid_client` dönerdi). `auth/revoke` uydurma jetona da 200 döndürüyor; Apple'ın belgelenmiş davranışı.
- Gerçek bir Apple hesabıyla uçtan uca deneme iOS derlemesi telefona kurulunca yapılabilir. Uygulama tarafı sonraki derlemeyle gelir; eski derleme kod göndermediği için sunucu onunla da çalışmayı sürdürüyor.

### Kalıcı oyuncu kimlikleri

- Oyuncu kimlikleri artık depodaki `data/registry/player_ids.csv` kaydından geliyor (72.435 satır, 1,4 MB). Kayıt mevcut veritabanından tohumlandı; hiçbir kimlik değişmedi.
- Doğrulama: veri hattının birleştirme adımı önbellekteki kaynaklarla bellekte yeniden çalıştırıldı (12 saniye, hiçbir dosya yazılmadan); 72.435 oyuncunun kimliği ve kaynakları mevcut veritabanıyla birebir aynı çıktı, kayıt değişmedi.
- Veri testleri 61 oldu; biri (`test_every_listed_portrait_has_an_image_file`) portre üretimi sürdüğü için şimdilik başarısız, üretim ve `export` bitince geçecek.

### Emülatörde doğrulama

Derleme göndermeden, bekleyen arayüz değişiklikleri emülatörde Expo Go ile açılıp denendi. Satın alma, reklam ve Google ile giriş modülleri Expo Go'da yok; kod bunları zaten koşullu yüklediği için uygulama onlarsız açılıyor.

- **Armalar.** XOX ve günün bulmacası ızgarasında Skia ile doğru çiziliyor (Barcelona, PSG, Juventus, Inter, Fenerbahçe, Galatasaray, Beşiktaş ve diğerleri görüldü).
- **Kart yerleşimi.** Yeni baş portresi kartın sağ üstünde, çenesi ad şeridinin üstünde duruyor. Sınama için geçici bir klasörden başka bir oyuncunun görseli sunuldu; üretim klasörüne dokunulmadı.
- **Bulunan sorun.** Günün bulmacasında cevabın yüzdesini gösteren rozet sağ üst köşedeydi ve yeni yerleşimde başın üstüne biniyordu. Rozet sol sütuna, bayrağın altına alındı ve boyutu hücreyle ölçeklenir oldu.
- **Bağlantı uyarısı.** Uçak kipi açılınca üstte kırmızı şerit çıkıyor, kapatılınca kayboluyor.
- **Klavye.** Futbolcu arama açılınca yazılım klavyesi kendiliğinden açılıyor.
- **Uyarı metni.** İlk açılış ekranlarında ve rakip arama ekranında görünüyor.
- Denenemeyenler: puan koruma (reklam modülü gerekir), şifremi unuttum ekranı, zincir ve kadro ekranlarındaki portreler.
- Not: Expo sunucusu `CI=1` ile başlatılırsa dosya değişikliklerini izlemez; emülatörde kod değişikliğini görmek için onsuz başlatılmalı.

### Toplu portre üretimi: ara durum (9 Ekim 2026, 01.05)

- **İndirme** (21.52–00.15): bilinirliği 20 ve üstü 10.783 oyuncunun 10.666'sının fotoğrafı serbest lisanslı ve indi; 117'si lisans yüzünden elendi.
- **Kırpma** (00.15–00.27): 8.053 fotoğraf kullanılabilir yüz verdi. Elenenler: yüz bulunamadı 1.383, yüz dönük 530, bulanık 322, kalabalık 284, dar kadraj 94.
- **Büyütme aşaması çöktü.** Küçük, bulanık ya da yüzü bulunamayan 2.544 fotoğrafın yüksek çözünürlüklü kopyası indirilirken tek bir indirme yarıda kesildi (`IncompleteRead`); indirme işlevi bu hatayı yakalamadığı için aşama durdu ve betik çizime geçti. Hiçbir kırpma değişmedi, yani çizim tutarlı girdilerle çalışıyor. İndirme işlevi düzeltildi; eksik büyük kaynaklar çizim sürerken ayrıca indiriliyor (çizimin okuduğu dosyalara dokunmaz).
- **Çizim** 00.35'te başladı; hız dakikada 12 görsel (görsel başına 5 saniye; ilk ölçümdeki 3,7 saniyeye kesim ve kayıt dahil değildi). 8.053 görselin bitişi yaklaşık 11.45.
- **Sonrası.** Çizim bitince büyütme aşaması yeniden çalıştırılacak, daha iyi kırpması çıkan oyuncuların görseli silinip yeniden çizilecek, yeni kurtarılanlar eklenecek. Çizim çalışırken kırpmalar değiştirilmemeli: çizim, yüz konumlarını başlarken okuyor.

### Yeni uygulama ikonu (9 Ekim 2026)

- Kullanıcı yeni bir amblem verdi: üzerinde ChallengeGoal bandı olan 3B top, volt halka ve hız çizgileri. İki dosyadan şeffaf olanı kaynak alındı (`data/branding/artwork/emblem.png`); koyu zeminli olan aynı çizimin düz zemine basılmış hali.
- Çizim 1024 pikselin yalnızca yüzde 43'ünü kaplıyor ve ortada değildi; olduğu gibi kullanılsa top ana ekranda çok küçük kalırdı. `data/branding/icons.py` amblemi halkaya göre ölçekleyip yerleştiriyor: iOS ikonunda halka tuvalin yüzde 61'i, Android uyarlanır ikonunda yüzde 47'si (güvenli alanın içinde), tek renkli ikon parlaklık eşiğiyle aynı çizimden türetiliyor.
- Aynı amblem açılış ekranına, Play simgesine (512), tanıtım görseline, sitenin logosuna, site simgelerine ve paylaşım görseline de kondu; site görselleri sunucuya yüklendi. Gol paketi simgelerindeki altın-mavi top para birimi simgesi olduğu için değişmedi.
- Kaynak 1,7 kat büyütüldüğü için 1024 piksellik ikonda yazı ve dikiş kenarları hafif yumuşak; telefon boyutlarında fark edilmiyor. Daha yüksek çözünürlüklü bir kaynak gelirse betik yeniden çalıştırılır.
- Uygulama ikonu sonraki derlemeyle değişir. Önizleme: `data/build/store/icon-preview.png`.

### 3B logo animasyonları, gol simgesi ve tasarımlı posta (9 Ekim 2026)

- **İstek.** Kullanıcı three.js ile hazırlanmış bir tasarım paketi getirdi ve nerede kullanılacağını söyledi: Gol kazanınca, Kupa kaybedince, Alev (yatay) sitenin başlığında; gol ve gol paketi simgeleri de yeni top olacak.
- **Karar.** Animasyonlar gerçek zamanlı 3B yerine tasarımın kendi sahnesinden alınmış şeffaf animasyonlu WebP olarak kondu (gerekçe teknik mimaride). Küçük gol simgelerinde bantsız top kullanıldı: 14-28 piksel boyutunda bant okunmayan koyu bir lekeye dönüşüyordu.
- **Yakalama.** Başsız Chrome'da zamanı elle ilerleten bir sürücüyle Gol 78, Kupa 96, Alev 79 kare alındı. Gol sahnesi, topun kadraja girişi görünsün diye 1,5 oranında geniş çizildi.
- **Doğrulama.** Emülatörde kaybedilen bot maçında kupa sahnesi oynadı; kazanma sahnesi, eşleme geçici olarak değiştirilerek aynı ekranda görüldü ve değişiklik geri alındı. Günlük ödül penceresinde bantlı top, sayaçlarda bantsız top görüldü. Gerçek bir galibiyetle sonuç ekranı denenmedi.
- **Site.** Başlıktaki logo ve yazı, alev animasyonlu topla değişti; beş sayfa da güncellendi ve yayına alındı.
- **Mağaza.** Gol paketi simgeleri yeni topla yeniden üretildi (`data/build/store/goals_cg_*.png`); Play Console'daki ürünlere kullanıcı yeniden yüklemeli.
- **Posta.** Kullanıcı şifre sıfırlama postasının geldiğini ama tasarımının kötü olduğunu söyledi. HTML tasarım yazıldı, sunucuya dağıtıldı, `destek@` adresine Türkçe ve İngilizce birer örnek gönderildi (Resend ikisini de kabul etti).
- **Depo ayarı.** `deploy/.gitattributes` `.webp` dosyasını metin sayıp satır sonlarını değiştiriyordu; `binary` satırı eklendi, depodaki kopyanın sitedekiyle aynı olduğu özetle doğrulandı.
- **Portre üretimi.** Yüksek çözünürlüklü 2.287 kaynak fotoğrafın hepsi indi (52 dakika). Çizim sürüyor.

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
| `add8884` | 7 Ekim | Belgeler: İlk 10 |
| `ee28abe` | 7 Ekim | Kulüplere katılış ve ayrılış yıllarının uygulama veritabanına eklenmesi |
| `29b0e36` | 7 Ekim | Kariyer Yolu kuralları (kural motoru) |
| `366f15b` | 7 Ekim | Kariyer Yolu mesajları ve kariyer sorguları |
| `f171bd2` | 7 Ekim | Sunucuda Kariyer Yolu odası ve botu |
| `b37d734` | 7 Ekim | Kariyer Yolu'nda 3–8 kulüplü kariyer sınırı |
| `c2ed18f` | 7 Ekim | Uygulamada Kariyer Yolu ekranı |
| `7006644` | 7 Ekim | Belgeler: Kariyer Yolu ve tamamlanan modlar |
| `3a984e4` | 7 Ekim | Arama sonuçlarından bayrağın kaldırılması |
| `5acabd0` | 7 Ekim | İki kişilik modun kaldırılması, ikinci tekil metinler |
| `07b7a54` | 7 Ekim | Sunucuda sıraya girmeden bot maçı (`play-bot`) |
| `4f0d24c` | 7 Ekim | "ONLINE" başlığının Latin büyük harfle kalması |
| `712cc55` | 7 Ekim | Seçilen oyunun listede ortalanması |
| `62cc21a` | 7 Ekim | Her modda Bota karşı girişi |
| `ca5472b` | 7 Ekim | Düello aramasında seçilen kartlar |
| `9df0f31` | 7 Ekim | Kart Düellosu'nda yedi farklı soru |
| `6094ce4` | 7 Ekim | Hangisi Yüksek'te soru türlerinin sırayla dönmesi |
| `c200157` | 7 Ekim | Bağlantı hatasında Tekrar dene |
| `90df859` | 7 Ekim | Belgeler: ilk geri bildirim düzeltmeleri |
| `014ce9b` | 7 Ekim | Puan, seviye, gol ve günlük ödül mesajları |
| `c34ab18` | 7 Ekim | Sunucuda puanlı maçlar, gol cüzdanı ve puana göre eşleştirme |
| `830ec2b` | 7 Ekim | Maçtan çıkış onayı, maç sonunda puan ve gol |
| `1ee955d` | 7 Ekim | Ana ekranda seviye, gol ve günlük ödül |
| `9d089ee` | 7 Ekim | Geçmiş ve istatistik ekranı |
| `ac4a1f7` | 7 Ekim | Belgeler: puan, seviye, gol ve geçmiş ekranı |
| `0e84e2a` | 7 Ekim | Belgeler: gol harcama, satın alma, reklam ve joker kararları |
| `a39cab5` | 7 Ekim | Joker mesajları |
| `80bdec1` | 7 Ekim | Joker için gol düşme ve maçta iki joker sınırı |
| `1089009` | 7 Ekim | Kariyer Yolu, İlk 10 ve Açık Artırma jokerleri |
| `bee12d7` | 7 Ekim | En Az Bilinen ve Zincir jokerleri |
| `07c04f6` | 7 Ekim | Hangisi Yüksek ve Kadro Kur jokerleri |
| `516da65` | 7 Ekim | Kart Düellosu ve XOX jokerleri |
| `d273bf6` | 7 Ekim | Yeniden bağlanınca gönderilen jokerlerin işaretlenmesi |
| `26088cb` | 7 Ekim | Uygulamada joker çubuğu |
| `708e829` | 7 Ekim | Belgeler: jokerler |
| `e277c84` | 7 Ekim | Belgeler: bilinen eksiklerin güncellenmesi |
| `84fc28d` | 7 Ekim | Lider tablosu ve bulmaca mesajları |
| `cc86ef6` | 7 Ekim | Sunucuda lider tablosu ve günün bulmacası |
| `dc701d6` | 7 Ekim | Bulmaca oyuncusunun ilk tahminde sayılması |
| `bf93189` | 7 Ekim | Uygulamada lider tablosu ve bulmaca ekranları |
| `923b92f` | 7 Ekim | Belgeler: lider tablosu ve günün bulmacası |
| `b9014c6` | 8 Ekim | Eğik başlık yazısında son kelimenin satırda kalması |
| `605b402` | 8 Ekim | Oyuncunun her modda solda, skorunun önde olması |
| `3fe58f9` | 8 Ekim | Puansız maç notu |
| `26f1747` | 8 Ekim | Açık Artırma ispatında açık kalan arama ve süre kuralı |
| `b6af49d` | 8 Ekim | İlk 10'da görünür durum satırı ve uzun başlık |
| `ec79b09` | 8 Ekim | Günlük ödülün her ana ekran açılışında ve uygulama öne gelince istenmesi |
| `9bab6ef` | 8 Ekim | Sunucuya ilk bağlantıda erken vazgeçme |
| `744474f` | 8 Ekim | Arkadaş maçından ana ekrana dönüş |
| `4e627bd` | 8 Ekim | Puansız maç notunda mod adı |
| `e880f9d` | 8 Ekim | Arama penceresinde odak ve klavye |
| `2636b4c` | 8 Ekim | XOX'ta rakibin cevabının rakibe ait gösterilmesi |
| `0d106c5` | 8 Ekim | Giriş formlarında eski hatanın silinmesi, şifre kuralı yazısı |
| `b887c09` | 8 Ekim | Boş maç geçmişi yazısı |
| `9543b57` | 8 Ekim | Oda kodunu paylaşma ve odanın oyunu |
| `214360d` | 8 Ekim | Gol yetmeyince joker uyarısı |
| `9bf3142` | 8 Ekim | Belgeler: uçtan uca kullanıcı testi |
| `81f77f5` | 8 Ekim | İlk günlük ödülde hoş geldin hediyesinin işaretlenmesi |
| `24054ad` | 8 Ekim | Dokuz oyunu, puanı ve golü anlatan tanıtım; ilk ödülde hoş geldin hediyesi |
| `b8e990d` | 8 Ekim | Belgeler: tanıtımın yenilenmesi ve kalan kararlar |
| `c542441` | 8 Ekim | Gizli güç puanıyla eşleştirme, düşmeyen seviye |
| `76f5de8` | 8 Ekim | Tanıtımda seviyenin düşmediği |
| `e5cfcd7` | 8 Ekim | Belgeler: gizli güç puanı |
| `dfcd59a` | 8 Ekim | Oyuna özel, hedefe göre bot seviyesi ve kaydı |
| `7d4af49` | 8 Ekim | Komşu zorlukla eşleşme |
| `4d89d1c` | 8 Ekim | Zincir, Açık Artırma ve Kariyer Yolu'nda uzun süreler |
| `1c9f1df` | 8 Ekim | En Az Bilinen'in şimdilik kaldırılması |
| `eec9807` | 8 Ekim | Belgeler: oyun dengesi |
| `2c345f6` | 8 Ekim | ChallengeGoal adı ve ikonu |
| `97c4075` | 8 Ekim | EAS derleme ayarları |
| `c11c49a` | 8 Ekim | Sunucuda hesap silme |
| `2fa9b89` | 8 Ekim | Hesap ekranında hesap silme |
| `8e0ee4a` | 8 Ekim | Canlı ortam dağıtımı, vekile güven |
| `14c32cf` | 8 Ekim | Google ve Apple ile giriş |
| `4d5f60e` | 8 Ekim | Yeni Google ve Apple hesabının bir kerelik kullanıcı adı seçimi (sunucu) |
| `069860d` | 8 Ekim | Kullanıcı adı seçme ekranı |
| `91d1da4` | 8 Ekim | Sunucudan bildirimler |
| `9f5bddb` | 8 Ekim | Cihazın bildirim kaydı ve dokununca yönlendirme |
| `8b4a6b9` | 8 Ekim | Satın almanın Apple ve Google ile doğrulanması, gol paketlerinin bir kez yazılması |
| `0cae329` | 8 Ekim | Gol mağazası ekranı ve ana ekrandan giriş |
| `33132cd` | 8 Ekim | Yayınlanmamış uygulamada App Store sandbox doğrulaması, reddedilen satın almaların günlüğü |
| `f37070b` | 8 Ekim | Mağaza anahtarlarının API kapsayıcısına bağlanması |
| `cd622d4` | 8 Ekim | Ödüllü reklamın imzalı AdMob bildirimiyle yazılması, günlük sınır |
| `ce9298a` | 8 Ekim | `app-ads.txt` |
| `3548d9d` | 8 Ekim | Kullanılmayan mikrofon, arka plan sesi, ekran üstü pencere ve depolama izinlerinin kaldırılması |
| `f084aa3` | 8 Ekim | Mağazada ödüllü reklam satırı, rıza akışı, reklam tercihleri bağlantısı |
| `0a9c423` | 8 Ekim | Gizlilik politikasında bildirim verisi |
| `2f7aa3f` | 8 Ekim | Mağaza görsellerinin üretimi (paket simgeleri, Play simgesi, tanıtım görseli) |
| `8fccd58` | 8 Ekim | Reklam kütüphanesinin Android derleme hatasına çözüm |
| `dcabab7` | 8 Ekim | Google giriş istemcilerinin tek projeye taşınması |
| `8cdaf9b` | 8 Ekim | E-postayla gönderilen kodla şifre sıfırlama (sunucu) |
| `63bb1d2` | 8 Ekim | Şifremi unuttum ekranı |
| `122b66d` | 8 Ekim | Yönetim paneli: anlık ve günlük istatistikler |
| `ae290f1` | 8 Ekim | Bağlantı uyarısı, futbolcu aramada klavye, rakip arama ekranında uyarı metni |
| `21de325` | 8 Ekim | Reklamla puan koruma (sunucu) |
| `dfee472` | 8 Ekim | Sonuç ekranında puan koruma |
| `86c2c8d` | 8 Ekim | Portrelerin yalnızca baş kesimiyle çizilmesi, bulanık kaynak eleği, bilinirlik 20+ |
| `910c175` | 8 Ekim | Üretilmiş kulüp armaları |
| `8b17a16` | 8 Ekim | Armalar, puan koruma ve yeni portre tarzının belgelenmesi |
| `8ca39d9` | 8 Ekim | Yalnızca baş portrelerin kartlara, zincir düğümlerine ve kadro yuvalarına oturtulması |
| `b8c96bd` | 8 Ekim | Mağaza metinleri ve üçüncü cihaz denemesinin kaydı |
| `48094dc` | 8 Ekim | Hesap silinince Apple ile giriş jetonunun iptali |
| `0b02850` | 8 Ekim | Apple jetonu iptalinin belgelenmesi |
| `b729993` | 8 Ekim | Kalıcı oyuncu kimliği kaydı |
| `0681e03` | 8 Ekim | Kimlik kaydının belgelenmesi |
| `77a2a18` | 8 Ekim | Bulmaca yüzde rozetinin bayrağın altına alınması |
| `f2272dc` | 8 Ekim | Emülatör denemelerinin kaydı |
| `85a6f94` | 9 Ekim | Yarım kalan indirmenin portre aşamalarını durdurmaması |
| `c29d573` | 9 Ekim | Portre üretiminin ara durumu |
| `37eb67b` | 9 Ekim | Yeni amblemle uygulama ikonu, mağaza görselleri ve site logosu |
| `ec2b7d5` | 9 Ekim | Yeni ikonun kaydı |
| `90d03ef` | 9 Ekim | Tasarımlı şifre sıfırlama postası |
| `9b11ee1` | 9 Ekim | Sonuç ekranında gol ve kupa sahneleri, yeni gol simgesi |
| `3a774e8` | 9 Ekim | Site başlığında alev animasyonu |
| `c1a35de` | 9 Ekim | Logo animasyonunun kaynağı ve yakalama düzeneği |
| `89de5bd` | 9 Ekim | Site WebP dosyalarının ikili saklanması |
