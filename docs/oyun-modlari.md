# Oyun Modları

Son güncelleme: 7 Ekim 2026

Uygulama yalnızca XOX olmayacak; aynı veriyle oynanan, hepsi sıra tabanlı dokuz mod içerecek. Bu belge her modun kuralını, veri ihtiyacını ve yapım sırasını tutar. Kurallar değiştikçe önce burası güncellenir.

## Ortak ilkeler

- Her mod iki kişiliktir ve online oynanır; rakip çıkmazsa gerçek oyuncu gibi görünen bot gelir. Arkadaş odası her modda çalışır.
- Maçın sahibi sunucudur: cevabı, istatistiği ve süreyi sunucu belirler. Uygulama yalnızca hamle gönderir ve sunucunun gönderdiği görünümü çizer.
- Gizli bilgi (rakibin eli, henüz açılmamış soru) uygulamaya hiç gönderilmez.
- Yeni modlar önce yalnızca online çalışır (bot dahil). İnternetsiz oynanış, mod oturduktan sonra eklenir. XOX'un internetsiz modları olduğu gibi kalır.
- Mod adları bize aittir; esinlenilen yapımların adları ve görselleri kullanılmaz.
- Kodda mod kimlikleri İngilizcedir; ekranda görünen adlar çeviri dosyalarından gelir.

## Modlar

| Kimlik | Ekrandaki ad | Kaynak | Durum |
|---|---|---|---|
| `grid` | Futbol XOX | İlk mod | Yayında |
| `duel` | Kart Düellosu | Kullanıcının istediği (yarışma programı biçimi) | Yapılıyor |
| `draft` | Kadro Kur | Kullanıcının istediği (kadro kurma biçimi) | Sırada |
| `higher` | Hangisi Yüksek | Öneri | Sırada |
| `chain` | Zincir | Öneri | Sırada |
| `rare` | En Az Bilinen | Öneri | Sırada |
| `auction` | Açık Artırma | Öneri | Sırada |
| `career` | Kariyer Yolu | Öneri | Sırada |
| `top-ten` | İlk 10 | Öneri | Sırada |

### Kart Düellosu (`duel`)

1. Maç bir konseptle açılır. Örnek: "Türkiye'den yurt dışına giden oyuncular", "Süper Lig'de oynamış yabancılar", "Dünya Kupası'nda oynamış oyuncular".
2. İki oyuncu, soruların ne olacağını bilmeden o konsepte uyan 7 futbolcu seçer. Seçim süresi sınırlıdır. Rakibin eli görünmez.
3. Eller kilitlenince sunucu 7 soru belirler. Sorular gizlidir ve sırayla açılır. Örnek: "Kariyerinde toplam golü fazla olan kazanır."
4. Her soruda iki oyuncu da elinden bir kart seçer. Seçimler aynı anda açılır; kartların altında o sorunun değeri görünür.
5. Değeri iyi olan 1 puan alır. Eşitlikte puan verilmez. Oynanan kart elden çıkar.
6. 7 soru sonunda puanı çok olan kazanır; puanlar eşitse maç berabere biter.

Kararlar:

- Bir futbolcu iki oyuncunun elinde de olabilir; seçimler gizli olduğu için engellenemez.
- Sorular, iki elin 14 kartının hepsinde değeri bilinen ölçütlerden seçilir. Böylece istatistiği olmayan bir kart yüzünden haksız soru çıkmaz.
- Süre dolunca seçim yapmayan oyuncunun eli ya da kartı rastgele tamamlanır.

### Kadro Kur (`draft`)

1. Maç bir hedefle açılır. Örnek: "En çok asist yapmış kadroyu kur."
2. Her oyuncunun boş bir kadrosu vardır: kaleci, defans, orta saha, forvet yuvaları.
3. Her turda rastgele bir kulüp çıkar. İki oyuncu da o kulüpte oynamış bir futbolcu seçip mevkisine uyan boş bir yuvaya koyar.
4. Futbolcunun hedef istatistiğindeki kariyer toplamı oyuncunun skoruna eklenir.
5. Yuvalar dolunca toplamı yüksek olan kazanır.

Kararlar:

- Aynı turda iki oyuncu aynı kulüpten seçer; aynı futbolcuyu ikisi birden alamaz, önce seçen alır.
- Futbolcu yalnızca kendi mevkisinin yuvasına konur.
- Değer kariyer toplamıdır (o kulüpteki değil).
- Süre dolunca o tur boş geçilir; yuva maç sonuna kadar boş kalabilir.

### Hangisi Yüksek (`higher`)

İki futbolcu ve bir ölçüt gösterilir (piyasa değeri, millî maç, gol). Sıradaki oyuncu hangisinin yüksek olduğunu söyler; doğruysa puan alır ve devam eder, yanlışsa sıra geçer. Belirli sayıda sorudan sonra puanı çok olan kazanır.

### Zincir (`chain`)

Bir futbolcuyla başlanır. Sıradaki oyuncu, bir öncekiyle aynı kulüpte oynamış bir futbolcu söyler. Söylenen ad tekrar kullanılamaz. Süresi dolan ya da yanlış söyleyen turu kaybeder; üç turu alan maçı kazanır.

### En Az Bilinen (`rare`)

Bir ölçüt çıkar ("Galatasaray'da oynamış Fransız"). İki oyuncu gizlice birer cevap yazar. Doğru cevaplardan bilinirlik puanı düşük olan turu alır; yanlış cevap turu kaybettirir. Beş tur oynanır.

### Açık Artırma (`auction`)

Bir ölçüt çıkar. Oyuncular sırayla "kaç tane sayarım" diye artırır. Pes eden, rakibine "say bakalım" demiş olur. Rakip söylediği sayı kadar doğru cevabı süre içinde sayarsa turu alır, sayamazsa kaybeder.

### Kariyer Yolu (`career`)

Gizli bir futbolcunun kulüpleri kariyer sırasıyla tek tek açılır. Oyuncular sırayla tahmin eder. Az ipucuyla bilen çok puan alır; yanlış tahmin sırayı geçirir.

### İlk 10 (`top-ten`)

Bir liste sorulur ("Süper Lig'de en çok gol atan 10 yabancı"). Oyuncular sırayla ad söyler. Listede olan ad sırasına göre puan getirir, olmayan ad can götürür. Canı biten ya da liste bitince puanı az olan kaybeder.

## Veri

### İstatistik kaynağı

| Kaynak | Ne veriyor | Kapsam |
|---|---|---|
| `salimt/football-datasets` (Transfermarkt'tan türetilmiş; Kaggle'da CC0) | Sezon, kulüp ve turnuva bazında maç, gol, asist, kart | Cevap olabilen 1.889 oyuncunun 1.392'si (%74). 1990'lardan bugüne kariyerler |
| Vikiveri (kulüp kayıtlarındaki maç ve gol sayıları) | Kulüp bazında lig maçı ve golü; asist yok | Yukarıdakinin dışında kalan 497 oyuncunun 431'i (çoğu 1975 öncesi doğumlu) |
| `transfermarkt-datasets` (mevcut kaynak) | Maç maç kayıt, yalnızca 2012 sonrası | Çapraz denetim için |

Kurallar:

- Oyuncunun istatistiği bir kaynaktan gelir: birinci kaynakta varsa oradan, yoksa Vikiveri'den. İki kaynağın sayıları toplanmaz.
- Her oyuncu için hangi ölçütlerin bilindiği tutulur. Asist yalnızca birinci kaynakta vardır.
- Erken sezonları eksik görünen oyuncular (veride ilk sezonu, doğum yılına göre beklenenden geç başlayanlar) "eksik kariyer" olarak işaretlenir ve toplam soran sorularda kullanılmaz.
- Dakika verisi birinci kaynakta seyrek olduğu için kullanılmaz.

Risk: iki Transfermarkt türevi kaynak da üçüncü kişilerce kazınıp serbest lisansla yayımlanmıştır. Sayılar olgu olduğu için telif konusu olmaz, ama Transfermarkt'ın kullanım koşulları ve veritabanı hakkı açısından risk mevcut kaynağımızla aynı türdendir. Site doğrudan kazınmaz.

### Modların veri ihtiyacı

| Mod | Gereken | Durum |
|---|---|---|
| `duel` | Konsept üyeliği (kulüp, lig, uyruk), kariyer istatistikleri, piyasa değeri, millî maç, yaş | İstatistik aktarımı yapılıyor |
| `draft` | Kulüp üyeliği, mevki, kariyer istatistikleri | İstatistik aktarımı yapılıyor |
| `higher` | Piyasa değeri, millî maç, yaş, istatistik | Hazır ölçütlerle başlar |
| `chain` | Kulüp üyeliği | Hazır |
| `rare` | Izgara ölçütleri, bilinirlik puanı | Hazır |
| `auction` | Izgara ölçütleri, cevap listeleri | Hazır |
| `career` | Tarihli kulüp kayıtları | Tam veritabanında var; uygulama veritabanına eklenecek |
| `top-ten` | Sıralı listeler | Değer ve millî maç hazır; gol listeleri istatistikten sonra |

## Teknik yaklaşım

- **Kural motoru.** Her modun kuralları `packages/game-core` içinde saf fonksiyonlarla yazılır ve testleri orada durur.
- **Oturum protokolü.** XOX'un mesajları değişmez. Yeni modlar ortak bir oturum mesajı kullanır: sunucu her değişiklikten sonra oyuncuya kendi görebildiği durumu ("görünüm") ve onu tetikleyen olayı gönderir; uygulama görünümü çizer, hamleyi `act` mesajıyla yollar.
- **Sunucu.** Her mod için bir "ev sahibi" vardır: kural motorunu veritabanına ve saate bağlar, botu oynatır. Eşleştirme sırası mod başınadır.
- **Uygulama.** Ana ekran mod seçimine dönüşür. Her modun kendi ekranı vardır; bağlantı, arama ve hata ekranları ortaktır.

## Yapım sırası

1. İstatistik aktarımı ve ortak oturum altyapısı.
2. Kart Düellosu.
3. Kadro Kur.
4. Hangisi Yüksek, Zincir.
5. En Az Bilinen, Açık Artırma.
6. Kariyer Yolu, İlk 10.

Her mod için bitti sayılma ölçütü: kural testleri, sunucu testleri (bot ve süre dolması dahil), emülatörde baştan sona bir maç.
