# Proje Yönelimi

Son güncelleme: 7 Ekim 2026

## Ürün

Türkiye pazarı için, futbol bilgisine dayalı ve online düello odaklı bir mobil oyun. Amiral oyun futbol XOX: 3×3 ızgaranın satır ve sütun başlıkları kulüp, uyruk gibi ölçütlerdir; oyuncu bir hücrenin iki ölçütünü de sağlayan bir futbolcunun adını yazarak o hücreyi alır, üçlü yapan kazanır. Aynı veriden beslenen başka mini oyunlar sonradan eklenir.

## Verilen kararlar

| Konu | Karar |
|---|---|
| Pazar | İlk pazar Türkiye. Uygulama yurt dışında da çalışacak şekilde kurulur |
| Dil desteği | Baştan çok dilli. İlk diller Türkçe ve İngilizce; cihaz diline göre seçilir, yedek dil İngilizce. Veride adlar dil, bilinirlik ve ızgaralar pazar boyutuyla tutulur |
| Platform | Android ve iOS birlikte; React Native + Expo |
| Çekirdek deneyim | Online 1'e 1 düello. Offline mod da desteklenir |
| Oyun modları | XOX'un yanında sekiz mod daha: Kart Düellosu, Kadro Kur, Hangisi Yüksek, Zincir, En Az Bilinen, Açık Artırma, İlk 10, Kariyer Yolu. Hepsi online, bot ve arkadaş odası destekli; internetsiz oyun şimdilik yalnızca XOX'ta. Kurallar [oyun-modlari.md](oyun-modlari.md) belgesinde |
| Rakip bulunamazsa | Rakip bot olur |
| Veri | Yalnızca ücretsiz kaynaklar |
| Kulüp logosu | Gerçek logo kullanılmaz |
| Oyuncu görseli | Olacak. Oyuncunun fotoğrafı bulunur ve bir araçla çizgi film tarzına çevrilir |
| Görsel dönüştürme | Yerel ekran kartında SDXL ile çizime çevirme. Pilotta klasik filtreyle karşılaştırıldı; filtre logoları koruduğu için elendi |
| Veri kaynağı | transfermarkt-datasets ile Wikidata birleştirilir |
| İlk sürümün lig kapsamı | Süper Lig ve beş büyük lig (İngiltere, İspanya, İtalya, Almanya, Fransa) |
| Sunucu | Kendi sunucumuz: Node.js ve WebSocket |
| Kod dili | Kodda ve veritabanı adlarında Türkçe tanım kullanılmaz. Oyuncuya görünen Türkçe metinler çeviri dosyasında durur |
| "Oynadı" kuralı | Kadroda olması yeter. Kiralık dönemler dahil her resmî kulüp kaydı sayılır |
| Uyruk kuralı | Yalnızca ana uyruk geçerlidir. İkinci vatandaşlıklar sayılmaz |
| Hamle süresi | 20 saniye |
| Maç formatı | Tek oyun |
| Üçlü olmazsa | Daha çok hücre alan kazanır; hücre sayısı eşitse beraberlik |
| Veri isteklerinde kimlik | Wikipedia ve diğer veri kaynaklarına giden isteklerde iletişim bilgisi olarak depo adresi gönderilir |
| Arayüz iddiası | Bu bir oyundur; arayüz ve kullanıcı deneyimi iddialı olacak. Düz uygulama görünümü yeterli değil |
| Arayüz teknolojisi | Skia, Reanimated, Lottie, expo-haptics, expo-audio. Oyun motoru kullanılmaz |
| Görsel yön | Gece stadyumu: koyu zemin, projektör ışığı, metalik oyuncu kartları |
| Arayüz hedef çıtası | EA FC Ultimate Team: metalik kartlar, sinematik geçişler, premium futbol havası |
| Tasarım durumu | İkinci sürüm kabul edildi; bu hâliyle kalıyor |
| Sunucu veritabanı | SQLite. Futbol verisi de SQLite olduğu için tek tür veritabanı; ileride PostgreSQL'e geçilebilir |
| Giriş yöntemleri | Misafir ve e-posta/şifre şimdi. Google ve Apple sonraya bırakıldı; sunucu tarafı hazır |
| Açılış ekranı | Uygulama sormadan misafir açmaz. Açılışta "misafir olarak devam et", "giriş yap" ve "hesap oluştur" seçenekleri çıkar |
| Misafirin dönüşü | Misafir her açılışta giriş ekranını görür; "misafir olarak devam et" her seferinde aynı misafir hesabını açar |
| Üyenin dönüşü | E-posta, Google ya da Apple ile giren oyuncu sonraki açılışlarda giriş ekranını görmez |
| Misafir ve hesap | Misafirken hesap açılamaz; önce çıkış yapılır. Misafir hesabı kalıcı hesaba dönüşmez |
| Kullanıcı adı | Kayıtta seçilir, sonradan değiştirilemez |
| Şifre kuralı | En az 8 karakter, bir büyük harf, bir küçük harf, bir rakam |
| Tanıtım | İlk açılışta oyunu anlatan üç sayfalık tanıtım gösterilir |
| Botun görünümü | Online'da rakip bulunamayınca gelen bot gerçek oyuncu gibi görünür, rastgele bir oyuncu adı taşır |
| Online maçın sahibi | Sunucu. Cevabı sunucu doğrular, süreyi sunucu sayar; uygulamaya güvenilmez |
| Eşleştirme | Sıra oyun, pazar ve zorluk başına. O oyundaki puana en yakın rakip seçilir; bekledikçe kabul edilen puan farkı büyür. 6–11 saniyede rakip çıkmazsa bot gelir |
| Bot seviyesi | Seçilen zorlukla başlar; oyuncunun son online sonuçlarına göre bir seviye güçlenir ya da zayıflar |
| Puan ve seviye | Her oyunun kendi puanı ve bunların toplamı olan toplam puan var. Seviye toplam puandan gelir. Puan yalnızca online sıra maçlarında (rakip çıkmayınca gelen gizli bot dahil) değişir; "Bota karşı" ve arkadaş odası puansızdır (7 Ekim 2026) |
| Gol | Puandan ayrı, oyun içi para birimi ve gelir kanalı. Her yeni hesaba 15 gol hediye; günlük giriş ödülü art arda günlerde 1, 2, 2, 3, 3, 4, 5 gol (7. günden sonra her gün 5); puanlı galibiyet 1 gol. İleride uygulama içi satın alma ve ödüllü reklamla da kazanılacak (7 Ekim 2026) |
| Golün kullanımı | Gol yalnızca maç içi jokerde harcanır. Her modun kendine özgü iki jokeri var; joker 3 gol, bir maçta en çok 2 joker. Puanlı maçlarda da kullanılabilir; kullanınca rakibe "Rakip joker kullandı" görünür. Liste [oyun-modlari.md](oyun-modlari.md) belgesinde |
| Gol satın alma | Misafir hesap gol satın alamaz; önce hesap açar (misafirin golü cihaza bağlı). Paketler ve fiyatlar mağaza hazırlığında (Adım 8) belirlenecek |
| Ödüllü reklam | İzlenen her reklam 2 gol, günde en çok 5 reklam (günde en çok 10 gol) |
| Maçtan çıkış | Süren maçtan çıkmadan önce onay istenir: "Maçı terk edersen mağlup sayılırsın". Android geri tuşu da aynı onayı açar |
| Kopan bağlantı | Oyuncu 30 saniye içinde dönerse maç sürer, dönmezse hükmen kaybeder. Maçtan çıkan da hükmen kaybeder |
| Arkadaş daveti | Beş karakterli oda kodu, on dakika geçerli |
| Oyuncu görselleri | 1.232 oyuncu için üretildi (cevap olabilen oyuncuların %65'i). Fotoğrafı uygun olmayan oyuncuda kart görselsiz kalır |
| Arayüz incelemesi | Geliştirme makinesine Android emülatörü kuruldu (7 Ekim 2026). Görünüm önce emülatörde, sonra telefonda incelenir |
| Belgeleme | Yapılan her iş `docs` altında düzenli olarak belgelenir |
| Git düzeni | Küçük commitlerle doğrudan `main` dalına gönderilir. Commitlerde Claude imzası olmaz |

## Rakiplerden çıkan dersler

| Uygulama | İndirme | Puan | Ders |
|---|---|---|---|
| Tactico | 50 B+ | 3,7 | Online XOX'a talep var. Maç sonu 30 saniyelik reklam, çift eşleşme hatası, beraberlikte maçın bitmesi ve tek mod puanı düşürüyor |
| Futbolcuyu Tahmin Et | 100 B+ | 4,45 | Çevrimdışı ve basit olan tutuyor. Az bilinen oyuncular "imkânsız" şikâyeti getiriyor |
| Futbol Quiz: Ultimate Test | 5 B+ | 4,7 | Az oyuncuyla "rakip bulunamadı" sorunu çıkıyor. Zorluk seviyesi isteniyor |
| Guess Football Teams | 1 Mn+ | 4,68 | Elle hazırlanan içerik bir günde bitiyor. Türkiye içeriği zayıf |

## Veri stratejisi

Durum: onaylandı (6 Ekim 2026).

İki ücretsiz kaynak birleştirilir. Transfermarkt sitesi doğrudan kazınmaz.

| Ölçüt | Wikidata | transfermarkt-datasets |
|---|---|---|
| Ölçek | 392 bin futbolcu, 263 bininde takım kaydı | 50 bin oyuncu, 175 bin transfer |
| Zaman derinliği | Tüm tarih | Yalnızca 2012 sonrası oynayanlar |
| Galatasaray–Fenerbahçe ortak oyuncu | 63 | 11 |
| Hagi, Hakan Şükür, Alex, Sergen Yalçın | Var | Yok |
| Galatasaray'ın 2023 sonrası transferleri | 60'ın 27'si kayıtlı | Tamamı |

- 2012 sonrası için transfermarkt-datasets, öncesi için Wikidata esas alınır.
- İki kaynak, Wikidata'da kayıtlı Transfermarkt kimlikleriyle eşleştirilir; kimliği olmayan oyuncularda doğum tarihi ve isim kullanılır.
- Türk kulüplerinde oynamış 6.137 oyuncuda uyruk %99, doğum tarihi %99,9, mevki %88 dolu.

Temizlenmesi gerekenler:

- Çok branşlı kulüp kaydına bağlanmış futbolcular (78 oyuncu futbol takımı yerine "Galatasaray SK" kaydına bağlı).
- Tarihî uyruk değerleri ("Osmanlı İmparatorluğu" gibi).
- Kiralık dönemler, altyapı ve B takımlarının "oynadı" sayılıp sayılmayacağı.

Transfermarkt veri seti de eksiksiz değildir (örneğin Mandžukić'in Atlético Madrid sezonu yok); bu boşlukları Wikidata doldurur. Wikidata'da ise doğrulanmamış güncel transfer söylentileri bulunur; bunlar atılır.

Izgaralar rastgele seçilemez. Tanınmış oyuncu şartıyla en büyük 8 Türk kulübünden rastgele kurulan ızgaraların %35'inde, 16 kulüpte %1'inde her hücrede en az 3 cevap çıkıyor. Geçerli ızgaralar önceden hesaplanır.

## Görsel stratejisi

Kaynak olarak Wikidata'nın işaret ettiği Wikimedia Commons fotoğrafları önerilir; bunlar serbest lisanslıdır ve üzerinde değişiklik yapılmasına izin verir.

| Bilinirlik (Vikipedi maddesi olan dil sayısı) | Oyuncu | Fotoğrafı olan |
|---|---|---|
| 40 ve üzeri | 280 | %98 |
| 15–39 | 1.108 | %82 |
| 6–14 | 1.906 | %47 |
| 0–5 | 2.843 | %7 |

- Türk kulüplerinde oynamış 6.137 oyuncunun 2.298'inde (%37) fotoğraf var. Dört büyüklerin tanınmış oyuncularında oran %89–94.
- 200 fotoğraflık örneklemde lisansların yaklaşık %70'i CC BY-SA, %15'i CC BY, %13'ü CC0 veya kamu malı.
- Yükümlülük: uygulamada her görselin yazarını ve lisansını gösteren bir "Görsel kaynakları" ekranı. CC BY-SA fotoğraflardan üretilen çizimler de aynı lisansla paylaşılmış sayılır.
- Fotoğrafı olmayan oyuncular için genel tasarımlı bir yedek kart gerekir.
- Dönüştürme yöntemi pilotla seçildi (7 Ekim 2026): yerel ekran kartında SDXL. Fotoğraf önce arka plandan ve forma logolarından temizlenir, sonra çizime çevrilir, en son arka plandan ayrılıp kartın zeminine oturtulur.
- Kullanılan modellerin hepsi ticari kullanıma izin veren lisanslıdır. Yüz tanıma modeli kullanılmaz.
- Görseller sunucudan verilir; uygulama paketine girmez.

Serbest lisans fotoğrafın telifini çözer; oyuncunun kişilik hakkı riski sürer. Bu risk bilinerek alınmıştır.

## Arayüz ve oyun hissi

Durum: teknoloji seti ve görsel yön onaylandı (7 Ekim 2026). Tasarım dili Adım 4B'de yazılacak.

Görsel yön "gece stadyumu": koyu zemin, projektör ışığı parlamaları, canlı vurgu renkleri ve skor tabelası tipografisi. Oyuncu kartlarının parlama efektleri koyu zeminde öne çıkar.

Oyun motoru (Unity, Godot gibi) kullanılmıyor. Sıra tabanlı, metin girişli bir bilgi oyununda motor; klavye, liste, çok dillilik ve uygulama boyutu açısından yük getirir. Oyun hissi hareket, ses, dokunsal geri bildirim ve görsel efektlerden gelir; bunlar Expo içinde kurulabilir.

| Katman | Teknoloji | Ne için |
|---|---|---|
| Özel çizim ve efekt | React Native Skia | Parıltı, gölgelendirici, parçacık, kart üzerinde ışık oyunu, sayaç halkası |
| Animasyon | Reanimated 4 | Hücre alma, sıra geçişi, ekran geçişleri; arayüz iş parçacığında akıcı |
| Dokunma hareketleri | Gesture Handler | Kart sürükleme, kaydırma |
| Hazır vektör animasyon | Lottie | Kazanma, kaybetme, yükleme sahneleri |
| Dokunsal geri bildirim | expo-haptics | Doğru, yanlış, süre uyarısı |
| Ses | expo-audio | Efekt sesleri ve kısa müzikler |
| Görseller | expo-image | Oyuncu kartlarının önbellekli yüklenmesi |
| Yazı tipi | expo-font | Markaya özgü tipografi |

Hepsi Expo SDK 57'nin sürüm sabitlediği paketlerdir. Reanimated, Gesture Handler ve expo-image projede kurulu; diğerleri Adım 4B'de eklenecek.

## Online mimari

Sunucu kendi yazdığımız bir Node.js ve WebSocket uygulamasıdır.

- Maç durumu sunucuda tutulur, cevabı sunucu doğrular.
- Eşleştirme tek bir sırayla işlenir; aynı oyuncu iki maça birden düşemez.
- Bot sunucuda çalışır, aynı cevap tablosunu kullanır.
- XOX kural motoru uygulama ve sunucu arasında ortak bir modüldür.
- Giriş (misafir, Google, Apple), veritabanı ve canlı bağlantı kendi kodumuzdur; hazır servis kullanılmaz.
- WebSocket için sürekli açık bir süreç gerekir. Ücretsiz barındırma seçenekleri sınırlıdır; bu, projenin olası ilk düzenli maliyetidir.

## Açık kararlar

1. Sunucu barındırma: nerede çalışacak?
2. Fotoğrafı olmayan oyuncular yedek kartla mı gösterilecek?
3. Gelir modeli: gol (satın alma ve ödüllü reklam) kararlaştırıldı; ayrıca reklamsız paket olacak mı?
4. Gol paketleri ve fiyatları (Adım 8'de).
5. Jokerlerin dengesi: fiyat ve maç sınırı gerçek oyuncu verisine göre gözden geçirilecek.
6. Uygulamanın adı. Şimdilik çalışma adı olarak "Futbol XOX" kullanılıyor.
7. Tıkanan oyun ne zaman biter? Şimdilik art arda dört turda hücre alınamazsa oyun biter ve hücre sayısına bakılır.
8. Uygulama veritabanı depoda mı kalsın, yoksa derleme sırasında mı indirilsin?

## Riskler

| Risk | Önlem |
|---|---|
| Oyuncu görselleri için kişilik hakkı şikâyeti veya mağazadan kaldırma | Serbest lisanslı kaynak, atıf ekranı, şikâyette görseli hızla yedek karta çevirme |
| Wikidata'nın son yıllarda eksik olması | 2012 sonrası için transfermarkt-datasets |
| transfermarkt-datasets yayınının durması | Her güncellemede son kopyayı saklamak |
| Online modda rakip bulunamaması | Bot, oda koduyla arkadaş daveti |
| Botun gerçek oyuncu gibi görünmesi oyuncuyu yanıltır; fark edilirse güven kaybettirir | Karar bilerek verildi. Bot adları ve davranışı inandırıcı olmalı; şikâyet gelirse etiketli bota dönülebilir |
| Google ve Apple girişi dış hesap ve özel derleme ister | Sunucu tarafı hazır; düğmeler geliştirici hesapları açılınca eklenir |
| Hesap açılan uygulamada mağazalar hesap silmeyi şart koşar | Yayından önce hesap silme eklenecek |
| Sunucu barındırma maliyeti ve bakım yükü | Sıra tabanlı hafif trafik tek küçük sunucuya sığar; barındırma Adım 5'ten önce seçilir |
