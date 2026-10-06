# Proje Yönelimi

Son güncelleme: 6 Ekim 2026

## Ürün

Türkiye pazarı için, futbol bilgisine dayalı ve online düello odaklı bir mobil oyun. Amiral oyun futbol XOX: 3×3 ızgaranın satır ve sütun başlıkları kulüp, uyruk gibi ölçütlerdir; oyuncu bir hücrenin iki ölçütünü de sağlayan bir futbolcunun adını yazarak o hücreyi alır, üçlü yapan kazanır. Aynı veriden beslenen başka mini oyunlar sonradan eklenir.

## Verilen kararlar

| Konu | Karar |
|---|---|
| Pazar | İlk pazar Türkiye. Uygulama yurt dışında da çalışacak şekilde kurulur |
| Dil desteği | Baştan çok dilli. İlk diller Türkçe ve İngilizce; cihaz diline göre seçilir, yedek dil İngilizce. Veride adlar dil, bilinirlik ve ızgaralar pazar boyutuyla tutulur |
| Platform | Android ve iOS birlikte; React Native + Expo |
| Çekirdek deneyim | Online 1'e 1 düello. Offline mod da desteklenir |
| Rakip bulunamazsa | Rakip bot olur |
| Veri | Yalnızca ücretsiz kaynaklar |
| Kulüp logosu | Gerçek logo kullanılmaz |
| Oyuncu görseli | Olacak. Oyuncunun fotoğrafı bulunur ve bir araçla çizgi film tarzına çevrilir |
| Görsel dönüştürme | Yerel ekran kartı var. Pilotta yerel yapay zekâ ve klasik filtre karşılaştırılır |
| Veri kaynağı | transfermarkt-datasets ile Wikidata birleştirilir |
| İlk sürümün lig kapsamı | Süper Lig ve beş büyük lig (İngiltere, İspanya, İtalya, Almanya, Fransa) |
| Sunucu | Kendi sunucumuz: Node.js ve WebSocket |
| Kod dili | Kodda ve veritabanı adlarında Türkçe tanım kullanılmaz. Oyuncuya görünen Türkçe metinler çeviri dosyasında durur |
| "Oynadı" kuralı | Kadroda olması yeter. Kiralık dönemler dahil her resmî kulüp kaydı sayılır |
| Uyruk kuralı | Yalnızca ana uyruk geçerlidir. İkinci vatandaşlıklar sayılmaz |
| Hamle süresi | 20 saniye |
| Maç formatı | Tek oyun |
| Üçlü olmazsa | Daha çok hücre alan kazanır; hücre sayısı eşitse beraberlik |
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
- Dönüştürme yöntemi, 20–30 oyunculuk bir pilotla seçilir. Adaylar: yerel ekran kartında çalışan yapay zekâ ve klasik filtre.

Serbest lisans fotoğrafın telifini çözer; oyuncunun kişilik hakkı riski sürer. Bu risk bilinerek alınmıştır.

## Online mimari

Sunucu kendi yazdığımız bir Node.js ve WebSocket uygulamasıdır.

- Maç durumu sunucuda tutulur, cevabı sunucu doğrular.
- Eşleştirme tek bir sırayla işlenir; aynı oyuncu iki maça birden düşemez.
- Bot sunucuda çalışır, aynı cevap tablosunu kullanır.
- XOX kural motoru uygulama ve sunucu arasında ortak bir modüldür.
- Giriş (misafir, Google, Apple), veritabanı ve canlı bağlantı kendi kodumuzdur; hazır servis kullanılmaz.
- WebSocket için sürekli açık bir süreç gerekir. Ücretsiz barındırma seçenekleri sınırlıdır; bu, projenin olası ilk düzenli maliyetidir.

## Açık kararlar

1. Sunucu barındırma: nerede çalışacak ve veritabanı ne olacak?
2. Fotoğrafı olmayan oyuncular yedek kartla mı gösterilecek?
3. Gelir modeli: ödüllü reklam ve reklamsız paket mi?
4. Bot açıkça bot olarak mı gösterilecek, sıralama puanını nasıl etkileyecek?
5. Joker olacak mı, olacaksa hangileri?
6. Uygulamanın adı. Şimdilik çalışma adı olarak "Futbol XOX" kullanılıyor.
7. Tıkanan oyun ne zaman biter? Şimdilik art arda dört turda hücre alınamazsa oyun biter ve hücre sayısına bakılır.

## Riskler

| Risk | Önlem |
|---|---|
| Oyuncu görselleri için kişilik hakkı şikâyeti veya mağazadan kaldırma | Serbest lisanslı kaynak, atıf ekranı, şikâyette görseli hızla yedek karta çevirme |
| Wikidata'nın son yıllarda eksik olması | 2012 sonrası için transfermarkt-datasets |
| transfermarkt-datasets yayınının durması | Her güncellemede son kopyayı saklamak |
| Online modda rakip bulunamaması | Bot, oda koduyla arkadaş daveti |
| Sunucu barındırma maliyeti ve bakım yükü | Sıra tabanlı hafif trafik tek küçük sunucuya sığar; barındırma Adım 5'ten önce seçilir |
