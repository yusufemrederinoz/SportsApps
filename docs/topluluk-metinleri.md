# Topluluk Metinleri

Son güncelleme: 31 Ekim 2026 (sürüm 1.1.0)

Forum ve topluluklarda geliştirici ağzından yazılan tanıtım metinleri. Kullanıcı her topluluğa bir kez, elle paylaşır. Paylaşım otomatik yapılmaz. İddialar `docs/magaza-metinleri.md` içindeki mağaza açıklamasıyla aynı kaynaktan gelir. Uygulama değişince burası da güncellenir.

## Ortak kurallar

Topluluk kuralları 31 Ekim 2026'da her topluluğun kendi kural sayfasından okundu. Reddit araçlara kapalı olduğu için okunamadı.

- **Açıklık.** Geliştiricinin kendisi olduğunu ve uygulamanın ücretsiz olduğunu açıkça söyle, belirli bir konuda geri bildirim iste.
- **Tek konu.** Her toplulukta tek konu açılır. Konu yukarı taşınmaz, aynı metin başka konuların altına yazılmaz, silinen konu yeniden açılmaz.
- **Bağlantı.** Referans kodu ve link kısaltıcı kullanılmaz. Bağlantı sitenin kaynak etiketli adresidir.
- **Cevap.** Gelen yorumlara geliştirici olarak sen cevap verirsin. Yanlış futbolcu bilgisi bildirilirse veri düzeltilir.
- **Vaat yok.** "Gerçek rakip" denmez. Online eşleşmede oyuncu az olduğunda sıradaki rakip gizli bot olabilir. "Reklamsız" denmez, "zorunlu reklam yok" denir. Gol paketleri olduğu söylenir.

## Kaynak etiketli bağlantılar

Site, `?k=` etiketiyle gelen ziyaretçinin Google Play bağlantısına aynı etiketi `utm_source` olarak ekler. Hangi kaynağın kaç indirme getirdiği Google Play Console'un edinme raporlarında UTM kaynağına göre görünür. App Store için Apple'ın kampanya bağlantısı ekip sağlayıcı numarası (`pt`) ister. Bu numara App Store Connect'te Uygulama Analizi bölümünden alınınca site App Store bağlantısına da `ct` etiketini ekleyecek.

| Yer | Bağlantı |
|---|---|
| Instagram biyografisi | `https://challengegoal.app/?k=instagram` |
| TikTok biyografisi | `https://challengegoal.app/?k=tiktok` |
| X biyografisi | `https://challengegoal.app/?k=x` |
| YouTube kanal açıklaması | `https://challengegoal.app/?k=youtube` |
| DonanımHaber | `https://challengegoal.app/?k=donanimhaber` |
| Technopat Sosyal | `https://challengegoal.app/?k=technopat` |
| Reddit | `https://challengegoal.app/?k=reddit` |

Etiket küçük harf, rakam ve tireden oluşur, en çok 32 karakterdir. Başka biçimdeki etiket yok sayılır.

## DonanımHaber

- **Yer.** Android Oyun ve Uygulamalar › Oyunlar: https://forum.donanimhaber.com/oyunlar--f812. Geliştiriciler kendi oyunlarını başlığa `[Kendi Projem]` yazarak paylaşıyor ve bu konular açık duruyor.
- **Kural.** Bölüm kuralları başka sitelerin ve firmaların reklamını yasaklıyor, reklam gibi yorumlar uyarısız siliniyor. Başlık büyük harfle ve fazla noktalamayla yazılmaz. Genel kurallar çift konuyu yasaklıyor. iOS Oyunlar bölümüne aynı konu ikinci kez açılmaz.
- **Hesap.** Üyelik için telefon doğrulaması gerekiyor.

**Başlık**

```
[Kendi Projem] ChallengeGoal: 8 oyunlu online futbol bilgi yarışması (Android, iOS, ücretsiz)
```

**Metin**

```
Merhaba,

Yeni yayınladığım futbol bilgi oyunu ChallengeGoal'ı paylaşmak istedim. Geliştiricisi benim, eleştiri ve önerilerinizi duymak isterim.

Uygulamada sekiz kısa futbol oyunu var:
• XOX: Satır ve sütundaki iki ölçüte uyan futbolcuyu yazıp üç hücreyi yan yana getiriyorsun.
• Kariyer Yolu: Kulüpler kariyer sırasıyla açılıyor, futbolcuyu en az ipucuyla bilen kazanıyor.
• Zincir: Bir öncekiyle aynı kulüpte oynamış bir futbolcu söylüyorsun, zinciri koparan turu kaybediyor.
• Açık Artırma: Kaç cevap sayabileceğini söyleyip artırıyorsun. Rakip "say bakalım" derse saymak zorundasın.
• Kart Düellosu, Kadro Kur, Hangisi Yüksek ve İlk 10.

Maçlar online eşleşmeyle ya da oda koduyla arkadaşınla oynanıyor. Isınmak için bota karşı da oynayabiliyorsun. Her gün herkese aynı ızgarayı veren bir günün bulmacası da var. Son güncellemeyle maç bitince rövanş ve maç sırasında tepkiler geldi.

Veride Süper Lig ve Avrupa'nın beş büyük liginde oynamış 70 binden fazla futbolcu var.

Reklam konusu: Maçın ortasında reklam çıkmıyor. Reklamı yalnızca sen istersen, gol kazanmak için izliyorsun. Uygulama ücretsiz, isteğe bağlı gol paketleri var.

Futbolcu görselleri yapay zekâ ile çizildi, kulüp armaları da özgün çizimler.

Google Play ve App Store'da "ChallengeGoal" diye aratınca çıkıyor. Bağlantılar burada: https://challengegoal.app/?k=donanimhaber

Hangi oyunu sevdiğinizi, neyin zor ya da eksik geldiğini yazarsanız sevinirim. Yanlış bir futbolcu bilgisi görürseniz söyleyin, düzelteyim.
```

## Technopat Sosyal

- **Yer.** Oyun Programlama: https://www.technopat.net/sosyal/bolum/oyun-programlama.324/. Bu bölümde geliştiriciler oyunlarını `[Devlog]` başlığıyla paylaşıyor. Okuyanlar geliştirici olduğu için metin nasıl yapıldığını anlatır.
- **Kural.** Reklamlı link kısaltıcı ve referans kodu paylaşanlar siteden uzaklaştırılıyor. Aynı mesajı dikkat çekmek için birden fazla konunun altına yazmak spam sayılıyor. Sosyal Oyunları bölümündeki futbolcu türetme konusuna bağlantı bırakılmaz.
- **Hesap.** Oyun bölümlerinde mesaj sayısı şartı yok.

**Başlık**

```
[Devlog] ChallengeGoal: React Native ile online futbol bilgi oyunu (Android, iOS, ücretsiz)
```

**Metin**

```
Merhaba,

Bir süredir geliştirdiğim online futbol bilgi oyunu ChallengeGoal yayında. Nasıl yaptığımı kısaca anlatıp geri bildirim istemek istedim.

Neler var: Sekiz kısa futbol oyunu (XOX, Kariyer Yolu, Zincir, Açık Artırma, Kart Düellosu, Kadro Kur, Hangisi Yüksek, İlk 10), online eşleşme, oda koduyla arkadaşla oyun, günün bulmacası ve haftalık lider tablosu.

Nasıl yapıldı:
• Uygulama Expo (React Native) ile yazıldı. Animasyonlar Skia ve Reanimated ile çiziliyor, maç içindeki tepkiler de Skia çizimi.
• Sunucu Node.js. Maçlar WebSocket üzerinden oynanıyor, cevapları sunucu doğruluyor. Sunucunun veritabanı SQLite.
• Futbol verisi Wikidata, Vikipedi'deki güncel kadrolar ve açık bir Transfermarkt veri setinden bir Python hattıyla birleştiriliyor. 70 binden fazla futbolcunun verisi telefona iniyor, futbolcu araması telefonda çalışıyor.
• Futbolcu görselleri yapay zekâ ile çizildi, kulüp armaları özgün çizimler.

Reklam: Zorunlu reklam yok. Yalnızca oyuncunun isterse izlediği ödüllü reklam var. İsteğe bağlı gol paketleri de var.

Bağlantı: https://challengegoal.app/?k=technopat
Google Play ve App Store'da "ChallengeGoal" diye aratınca da çıkıyor.

Özellikle merak ettiklerim: İlk açılışta kafa karıştıran bir şey var mı, hangi oyun sıkıcı geliyor, maçlar telefonunuzda akıcı mı?
```

## Reddit (r/superlig)

- **Kural.** Okunamadı. Paylaşmadan önce `old.reddit.com/r/superlig/about/rules` ve sabitlenmiş konular okunmalı. Tanıtım yasaksa ya da emin değilsen moderatörlere mesajla sorulur. Konu sessizce kaybolursa hesap yaşı ya da karma sınırına takılmış olabilir, bu da moderatörlere sorulur.
- **Biçim.** Düz tanıtım yerine Kariyer Yolu videosu soru olarak paylaşılır (`data/build/promo/videos/quiz/challengegoal-tr-quiz-career.mp4`). Geliştirici olduğun ilk yorumda söylenir.

**Başlık**

```
Beş kulüp, tek futbolcu. Kaçıncı kulüpte bildiniz?
```

**İlk yorum**

```
Videodaki oyun benim geliştirdiğim ChallengeGoal'daki Kariyer Yolu modu. Kulüpler katılış yılına göre açılıyor, ne kadar erken bilirsen o kadar çok puan alıyorsun. Kariyer uygulamanın verisine göre, eksik bir dönem görürseniz söyleyin. Futbolcu görselleri yapay zekâ çizimi.

Uygulama ücretsiz, maçın ortasında reklam çıkmıyor. Google Play ve App Store'da "ChallengeGoal" diye aratınca çıkıyor: https://challengegoal.app/?k=reddit
```

## Ekşi Sözlük

Yeni hesapla tanıtım yapılamaz. Yazar olmayan hesabın entry'leri onaylanana kadar görünmez, 10 entry'den sonra çaylak onay sırasına girilir. Başlık açmak için yazar olduktan sonra 6 ay geçmesi ve 100 entry gerekir (Ekşi Sözlük'ün 11 Mart 2023 tarihli kuralı). "challengegoal" başlığı yok. Uzun süredir yazar olan biri oyunu kendiliğinden yazarsa görünür. Bunun dışında Ekşi denenmez.
