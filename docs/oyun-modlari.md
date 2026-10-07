# Oyun Modları

Son güncelleme: 7 Ekim 2026

Uygulama yalnızca XOX olmayacak; aynı veriyle oynanan, hepsi sıra tabanlı dokuz mod içerecek. Bu belge her modun kuralını, veri ihtiyacını ve yapım sırasını tutar. Kurallar değiştikçe önce burası güncellenir.

## Ortak ilkeler

- Her modun kendi puanı vardır. Puan yalnızca online sıra maçlarında değişir (gizli bot dahil); "Bota karşı" ve arkadaş odası puansızdır. Puanlı galibiyet 1 gol getirir. Ayrıntı [teknik-mimari.md](teknik-mimari.md) belgesinde "Puan, seviye ve gol" bölümünde.
- Her modun iki jokeri var (aşağıda "Jokerler"). Joker 3 gol; bir maçta en çok 2 joker kullanılır; puanlı maçlarda da geçerlidir.
- Her mod iki kişiliktir ve online oynanır; rakip çıkmazsa gerçek oyuncu gibi görünen bot gelir. Arkadaş odası her modda çalışır. Ana ekrandaki "Bota karşı" girişi her modda beklemeden "Bot" adlı rakiple maç açar (XOX'ta bu maç internetsiz, telefonda oynanır).
- Maçın sahibi sunucudur: cevabı, istatistiği ve süreyi sunucu belirler. Uygulama yalnızca hamle gönderir ve sunucunun gönderdiği görünümü çizer.
- Gizli bilgi (rakibin eli, henüz açılmamış soru) uygulamaya hiç gönderilmez.
- Yeni modlar önce yalnızca online çalışır (bot dahil). İnternetsiz oynanış, mod oturduktan sonra eklenir. XOX'un internetsiz modları olduğu gibi kalır.
- Mod adları bize aittir; esinlenilen yapımların adları ve görselleri kullanılmaz.
- Kodda mod kimlikleri İngilizcedir; ekranda görünen adlar çeviri dosyalarından gelir.

## Jokerler

Kararlar (7 Ekim 2026): her modun kendine özgü iki jokeri var. Joker 3 gol tutar ve oyuncunun gol bakiyesinden düşer. Bir oyuncu bir maçta en çok 2 joker kullanır (iki farklı ya da aynı jokeri iki kez). Puanlı maçlarda da kullanılır. Joker kullanılınca rakibin ekranında "Rakip joker kullandı" görünür; jokerin verdiği bilgi yalnızca kullanana gider. Jokerin geçerli olup olmadığına ve etkisine sunucu karar verir. Joker yalnızca online maçlarda var (XOX'un internetsiz bot maçında yok). Açılan bilgi o tur ya da soru boyunca ekranda kalır.

Ne zaman kullanılabilir: sıra tabanlı modlarda kendi sıranda (Zincir, Hangisi Yüksek, XOX); aynı anda oynanan modlarda kendi cevabını vermeden önce (Kadro Kur, En Az Bilinen, Kart Düellosu'nda kart oynamadan önce); Kariyer Yolu ve İlk 10'da liste ya da futbolcu açıkken; Açık Artırma'da "Sayıyı gör" teklif ve ispat sırasında, "Ek süre" yalnızca ispat eden oyuncuya. XOX'ta jokerler hücreye dokununca açılan arama penceresindedir; ipucu o hücre içindir. Kart Düellosu'nda "Kart değiştir" için önce eldeki kart seçilir.

| Mod | Joker | Etkisi |
|---|---|---|
| XOX | Ek süre | Bu hamleye +15 saniye |
| XOX | İpucu | Seçilen hücreye uyan, henüz kullanılmamış tanınmış bir futbolcunun baş harfi ve doğum yılı |
| Kart Düellosu | Kart değiştir | Elden seçilen kart, konsepte uyan rastgele bir kartla değişir (oynanmadan önce) |
| Kart Düellosu | Değerleri gör | Bu turun sorusunda kendi kartlarının değerleri görünür |
| Kadro Kur | Ek süre | Bu tura +15 saniye |
| Kadro Kur | Asistleri gör | Bu turda arama sonuçlarında futbolcuların kariyer asistleri görünür |
| Hangisi Yüksek | Pas | Soru cevaplanmadan geçilir; seri bozulmaz, sıra oyuncuda kalır, yeni soru gelir |
| Hangisi Yüksek | Bir değer | İki karttan birinin değeri açılır |
| Zincir | Ek süre | Bu hamleye +10 saniye |
| Zincir | Kulüp ipucu | Son futbolcunun, bağlanabilecek en çok futbolcusu olan kulübü gösterilir |
| En Az Bilinen | Ek süre | Bu tura +15 saniye |
| En Az Bilinen | İpucu | İki ölçüte uyan az bilinen bir futbolcunun baş harfi |
| Açık Artırma | Sayıyı gör | İki ölçüte uyan tanınmış futbolcu sayısı |
| Açık Artırma | Ek süre | İspata +15 saniye |
| İlk 10 | Ek can | Bu listede +1 can |
| İlk 10 | Baş harf | Listede henüz bulunmamış bir ismin baş harfi |
| Kariyer Yolu | Uyruk | Gizli futbolcunun uyruğu |
| Kariyer Yolu | Mevki | Gizli futbolcunun mevkisi ve doğum yılı |

## Günün bulmacası

Kararlar (7 Ekim 2026): herkes aynı gün aynı XOX ızgarasını çözer (Türkiye pazarı, orta zorluktaki ızgaralardan güne göre seçilen biri). Online oynanır.

- **Haklar.** 9 tahmin hakkı. Her tahmin bir hak götürür; yanlış tahmin ya da aynı futbolcuyu ikinci kez yazmak da. Dolu hücreye tahmin yapılamaz.
- **Puan.** Her dolu hücre en çok 100 puan. Puan `100 − 100 × (aynı cevabı veren diğer kişi sayısı) / (o hücreye cevap veren herkes)` ile hesaplanır: hücreyi tek başına dolduran ya da kimsenin vermediği cevabı yazan 100 alır, herkesin verdiği cevap en az puanı getirir. İlk çözen cezalandırılmaz. Puanlar gün boyunca, başkaları oynadıkça değişebilir. En yüksek toplam 900.
- **Bitiş ve ödül.** Haklar bitince ya da 9 hücre dolunca bulmaca biter. Bitirene 2 gol, 9/9 yapana ek 3 gol. Oyun puanını ve seviyeyi etkilemez.
- **Sıralama ve paylaşma.** Günün sıralaması toplam puana göre (eşitlikte dolu hücre sayısı). Sonuç, dolu ve boş hücreleri gösteren bir kare dizisiyle paylaşılabilir. Bulmaca her gün Türkiye saatiyle 00.00'da değişir; numarası 1 Ekim 2026'dan sayılır.

## Modlar

| Kimlik | Ekrandaki ad | Kaynak | Durum |
|---|---|---|---|
| `grid` | Futbol XOX | İlk mod | Yayında |
| `duel` | Kart Düellosu | Kullanıcının istediği (yarışma programı biçimi) | Yayında (online, bot ve arkadaş odası dahil) |
| `draft` | Kadro Kur | Kullanıcının istediği (kadro kurma biçimi) | Yayında (online, bot ve arkadaş odası dahil) |
| `higher` | Hangisi Yüksek | Öneri | Yayında (online, bot ve arkadaş odası dahil) |
| `chain` | Zincir | Öneri | Yayında (online, bot ve arkadaş odası dahil) |
| `rare` | En Az Bilinen | Öneri | Yayında (online, bot ve arkadaş odası dahil) |
| `auction` | Açık Artırma | Öneri | Yayında (online, bot ve arkadaş odası dahil) |
| `career` | Kariyer Yolu | Öneri | Yayında (online, bot ve arkadaş odası dahil) |
| `top-ten` | İlk 10 | Öneri | Yayında (online, bot ve arkadaş odası dahil) |

### Kart Düellosu (`duel`)

1. Maç bir konseptle açılır. Örnek: "Türkiye'den yurt dışına giden oyuncular", "Süper Lig'de oynamış yabancılar", "Dünya Kupası'nda oynamış oyuncular".
2. İki oyuncu, soruların ne olacağını bilmeden o konsepte uyan 7 futbolcu seçer. Seçim süresi sınırlıdır. Rakibin eli görünmez.
3. Eller kilitlenince sunucu 7 soru belirler. Sorular gizlidir ve sırayla açılır. Örnek: "Kariyerinde toplam golü fazla olan kazanır."
4. Her soruda iki oyuncu da elinden bir kart seçer. Seçimler aynı anda açılır; kartların altında o sorunun değeri görünür.
5. Değeri iyi olan 1 puan alır. Eşitlikte puan verilmez. Oynanan kart elden çıkar.
6. 7 soru sonunda puanı çok olan kazanır; puanlar eşitse maç berabere biter.

Kararlar:

- Bir futbolcu iki oyuncunun elinde de olabilir; seçimler gizli olduğu için engellenemez.
- Bir maçta 7 sorunun hepsi farklıdır. Önce iki elin 14 kartının hepsinde değeri bilinen ölçütler kullanılır; yeterince istatistik varsa yaş sorularından yalnızca biri ("yaşı büyük" ya da "yaşı küçük") sorulur. Hepsinde bilinen ölçüt 7'den azsa kalan sorular en çok kartta bilinen ölçütlerden tamamlanır; o soruda değeri bilinmeyen kart kaybeder ve değeri "?" görünür. Bu durum çoğunlukla asist ve sarı kart verisi olmayan eski yıldızlarda (Hagi, Maradona, Metin Oktay gibi) çıkar.
- Süre dolunca seçim yapmayan oyuncunun eli ya da kartı rastgele tamamlanır.

Uygulanan hâli (7 Ekim 2026):

- **Konseptler.** "Süper Lig tarihindeki yabancılar", "Yurt dışında oynamış yerli oyuncular", bir kulübün forması giymiş oyuncular, bir ülkenin futbolcuları, bir ligin oyuncuları. Konsept türü önce eşit olasılıkla, sonra o türün içinden seçilir; 36 kulüp konsepti olduğu hâlde kulüp konsepti beşte bir olasılıkla çıkar. Bir konseptin açılabilmesi için bilinirliği 45 ve üzeri, karşılaştırılabilir en az 25 oyuncusu olmalı. Türkiye pazarında 54 konsept var.
- **Kart havuzu.** Konsepte uyan ve kariyer istatistiği olan (en az bir maçı ve doğum yılı bilinen) her futbolcu seçilebilir; bilinirlik şartı yoktur. Arama yalnızca konsepte uyanları gösterir.
- **Ölçütler.** Kariyer golü, asist, maç, sarı kart, maç başına gol (iki basamak), en yüksek piyasa değeri, millî maç, yaşı büyük olan, yaşı küçük olan. Yaş soruları doğum yılıyla karşılaştırılır.
- **Süreler.** Kart seçimi 90 saniye, her tur 20 saniye, kartların açık kaldığı ara 4,5 saniye. Sunucu ağ gecikmesi için 1,5 saniye pay bırakır.
- **Eksik el.** Oyuncu "Rastgele tamamla" ile seçtiği kartları gönderir; sunucu eksikleri konseptin tanınmış 60 oyuncusu arasından rastgele doldurur. Süre dolarken uygulama o ana kadar seçilenleri kendiliğinden gönderir.
- **Bot.** Konseptin tanınmış 60 oyuncusundan el kurar. Her ölçütte en iyi kartı aday sayar; zorluk 1'de bunlardan 1, zorluk 2'de 4, zorluk 3'te 7 tanesini alır, kalanı rastgeledir. Turda soruya en uygun kartı zorluğa göre %30, %60 ya da %85 olasılıkla oynar. Kart seçimini 9–26 saniyede, rakip hazır olunca 1,5–4 saniyede bitirir; turda 2–7 saniye düşünür.
- **"Dünya Kupası'nda oynamış oyuncular"** gibi turnuva konseptleri henüz yok: veritabanında turnuva katılımı tutulmuyor.

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

Uygulanan hâli (7 Ekim 2026):

- **Kadro.** 7 yuva: 1 kaleci, 2 defans, 2 orta saha, 2 forvet. Maç 7 tur sürer; her turda iki oyuncu da birer futbolcu alır.
- **Hedef.** Kariyer asist toplamı. Asist verisi olmayan futbolcular (çoğu Vikiveri kaynaklı eski oyuncular) seçilemez; arama yalnızca o turun kulübünde oynamış, mevkisi boş bir yuvaya uyan, asist verisi olan ve henüz alınmamış futbolcuları gösterir.
- **Kulüpler.** Her mevkide tanınmış (bilinirliği 32 ve üzeri) en az 2 kaleci ve 4'er defans, orta saha, forvet oyuncusu olan kulüpler (Türkiye pazarında 54). Zorluk 1'de en tanınmış 16, zorluk 2'de 32 kulüp arasından, zorluk 3'te hepsinden 7 farklı kulüp çekilir. Gelecek turların kulübü önceden gösterilmez.
- **Seçimler açıktır.** Rakibin aldığı futbolcu ve asist sayısı hemen iki tarafa da görünür; aynı futbolcuyu önce seçen alır.
- **Süreler.** Her tur 30 saniye; iki taraf da seçince 3 saniyelik ara, sonra yeni kulüp.
- **Bot.** Zorluk 3'te boş yuvalarına uyan en yüksek asistli futbolcuyu, zorluk 2'de en yüksek 4 asistten birini, zorluk 1'de tanınmış futbolculardan rastgele birini alır. 4–14 saniyede seçer.

### Hangisi Yüksek (`higher`)

İki futbolcu ve bir ölçüt gösterilir (piyasa değeri, millî maç, gol). Sıradaki oyuncu hangisinin yüksek olduğunu söyler; doğruysa puan alır ve devam eder, yanlışsa sıra geçer. Belirli sayıda sorudan sonra puanı çok olan kazanır.

Uygulanan hâli (7 Ekim 2026):

- **Eller.** Her oyuncunun 3 eli var (toplam 6). Bir el, oyuncu bilemeyene ya da üst üste 5 doğruya ulaşana kadar sürer; böylece iki taraf da eşit sayıda el oynar ve tek bir oyuncu maçı baştan sona tutamaz.
- **Sorular.** Kariyer golü, asist, maç, en yüksek piyasa değeri, millî maç, kim daha yaşlı, kim daha genç. İki futbolcu da o ölçütte değeri bilinen, bilinirliği zorluğa göre (55, 45, 35 ve üzeri) olan oyunculardan seçilir. Değerler arasında zorluğa göre fark aranır: oranla 1,5 / 1,25 / 1,1 kat; yaşta 5 / 3 / 1 yıl. Bir futbolcu aynı maçta iki kez çıkmaz. Sorular sırayla döner: yedi soru türünün hepsi sorulmadan biri ikinci kez gelmez ve aynı soru türü art arda iki kez sorulmaz.
- **Süre.** Cevap 10 saniye; cevaptan sonra değerler 2,5 saniye açık kalır. Süre dolarsa yanlış sayılır.
- **Bot.** Zorluğa göre %62, %75 ya da %88 olasılıkla doğru kartı seçer; 2–6 saniye düşünür.

### Zincir (`chain`)

Bir futbolcuyla başlanır. Sıradaki oyuncu, bir öncekiyle aynı kulüpte oynamış bir futbolcu söyler. Söylenen ad tekrar kullanılamaz. Süresi dolan ya da yanlış söyleyen turu kaybeder; üç turu alan maçı kazanır.

Uygulanan hâli (7 Ekim 2026):

- **Başlangıç.** Her tur, tanınmış (bilinirliği 55 ve üzeri) ve veritabanında en az 3 kulübü olan bir futbolcuyla açılır; aynı maçta başlangıç futbolcusu tekrarlanmaz. Turu başlatan oyuncu her turda değişir.
- **Ortak kulüp.** Veritabanındaki kulüpler Süper Lig ve Avrupa'nın beş büyük liginden; bu liglerin dışındaki bir kulüpte birlikte oynamak bağlantı sayılmaz. Ekranda bu yazıyor ve her bağlantının hangi kulüpten kurulduğu gösteriliyor (iki futbolcunun birden fazla ortak kulübü varsa önce yerli lig kulübü).
- **Tekrar.** Bir ad aynı turda iki kez söylenemez; arama penceresi zincirdekileri zaten göstermiyor.
- **Süre.** Zincir uzadıkça kısalır: 20 saniyeyle başlar, her iki halkada 2 saniye azalır, en az 8 saniye. Tur sonu 3 saniye gösterilir.
- **Bot.** Ortak kulüplü tanınmış futbolculardan seçer. Zorluğa göre ve zincir uzadıkça artan bir olasılıkla pes eder; pes ederken süreyi doldurmak yerine yanlış bir ad söyler (insan oyuncu boşuna beklemesin diye).

### En Az Bilinen (`rare`)

Bir ölçüt çıkar ("Galatasaray'da oynamış Fransız"). İki oyuncu gizlice birer cevap yazar. Doğru cevaplardan bilinirlik puanı düşük olan turu alır; yanlış cevap turu kaybettirir. Beş tur oynanır.

Uygulanan hâli (7 Ekim 2026):

- **Ölçütler.** Seçilen zorluktaki hazır ızgaralardan biri çekilir; beş tur, o ızgaranın beş farklı hücresidir (her hücrenin en az 3 bilinen cevabı olduğu ızgara üreticisinde zaten garanti).
- **Gizli cevap.** Her oyuncu turda bir kez cevap verir; rakip yalnızca cevap verilip verilmediğini görür. İki cevap gelince ya da 30 saniye dolunca cevaplar açılır (4,5 saniye).
- **Puan.** İkisi de doğruysa bilinirlik puanı düşük olan turu alır (eşitse kimse almaz); yalnızca biri doğruysa o alır; ikisi de yanlışsa kimse almaz. Bilinirlik puanı olmayan doğru cevap 0 sayılır, yani en az bilinen odur.
- **Bot.** Hücrenin bilinen cevaplarını bilinirliğe göre dizer; zorluğa göre listenin üst, orta ya da alt kısmından seçer. Zorluğa göre %30, %15 ya da %7 olasılıkla bilemez; bilemediğinde boş bırakmak yerine satıra uyan ama sütuna uymayan akla yatkın yanlış bir ad yazar (insan oyuncu süre dolana kadar beklemesin diye).

### Açık Artırma (`auction`)

Bir ölçüt çıkar. Oyuncular sırayla "kaç tane sayarım" diye artırır. Pes eden, rakibine "say bakalım" demiş olur. Rakip söylediği sayı kadar doğru cevabı süre içinde sayarsa turu alır, sayamazsa kaybeder.

Uygulanan hâli (7 Ekim 2026):

- **Ölçütler.** Seçilen zorluktaki bir ızgaranın, bilinirliği 32 ve üzeri en az 6 cevabı olan hücreleri; maç en çok üç tur, iki tur alan kazanır. Turu açan oyuncu her turda değişir.
- **Teklif.** Teklif bir öncekinden büyük olmalı, en çok 12. İlk teklif zorunlu ("Say bakalım" ancak bir teklif varken denebilir). Teklif sırası 15 saniye; süresi dolan oyuncu, ortada teklif yoksa 1 demiş, varsa "Say bakalım" demiş sayılır. 12'ye çıkan teklif doğrudan ispata gider.
- **İspat.** Süre 8 saniye + teklif başına 5 saniye. Yazılan doğru isimler yeşil, yanlışlar üstü çizili görünür; yanlış isim süreden yer ama turu bitirmez. Hedefe ulaşınca tur hemen biter.
- **Bot.** Hücrenin tanınmış cevaplarının zorluğa göre %35, %55 ya da %75'ini "bilir"; bildiği kadar (kolay ve orta seviyede bazen bir fazla) teklif verir, aşılınca "Say bakalım" der. İspatta bildiklerini 3–6 saniye arayla yazar; bildikleri biterse süreyi beklemeden pes eder.

### Kariyer Yolu (`career`)

Gizli bir futbolcunun kulüpleri kariyer sırasıyla tek tek açılır. Oyuncular sırayla tahmin eder. Az ipucuyla bilen çok puan alır; yanlış tahmin sırayı geçirir.

Uygulanan hâli (7 Ekim 2026):

- **Futbolcular.** Maçta 4 gizli futbolcu var. Bilinirliği zorluğa göre 65, 55 ya da 45 ve üzeri; bütün kulüplerinin katılış yılı bilinen ve 3–8 kulübü olan futbolcular seçilir (daha uzun kariyerler tek ekrana sığmıyor).
- **İpuçları.** Kulüpler katılış yılına göre sıralanır ve yıllarıyla gösterilir ("2001–2003 FC Metz"). Yalnızca Süper Lig ve beş büyük ligin kulüpleri var; bu ekranda yazıyor.
- **Puan.** Bir kulüp açıkken bilen, kulüp sayısı kadar puan alır; her yeni kulüp puanı bir azaltır (en az 1). Yanlış ya da süresi dolan tahmin yeni bir kulüp açar ve sırayı geçirir. Bütün kulüpler açıldıktan sonra bir tahmin hakkı daha var; kimse bilemezse tur puansız biter. Futbolcuyu ilk tahmin eden her turda değişir.
- **Süre.** Tahmin başına 15 saniye; tur sonunda bütün kariyer ve futbolcunun kartı 5 saniye gösterilir.
- **Bot.** Açık kulüp sayısıyla artan bir olasılıkla bilir (zorluğa göre başlangıç %12, %22 ya da %32; her kulüpte +%15). Bilemediğinde gizli futbolcuyla aynı kulüpte oynamış birini söyler.

### İlk 10 (`top-ten`)

Bir liste sorulur ("Süper Lig'de en çok gol atan 10 yabancı"). Oyuncular sırayla ad söyler. Listede olan ad sırasına göre puan getirir, olmayan ad can götürür. Canı biten ya da liste bitince puanı az olan kaybeder.

Uygulanan hâli (7 Ekim 2026):

- **Listeler.** "En yüksek piyasa değerine ulaşmış 10 {ülke} futbolcusu", "Kariyerinde en çok gol atan 10 {ülke} futbolcusu", "{kulüp} forması giymiş, kariyerinde en çok gol atan 10 futbolcu". Ülkeler ve kulüpler Kart Düellosu konseptleriyle aynı (yeterince tanınmış oyuncusu olanlar). Maç iki listeyle oynanır.
- **Millî maç listeleri yok.** Millî maç sayısı kaynağı 2012 sonrası aktif oyuncuları kapsıyor; "en çok millî maça çıkan Türkler" listesinde Rüştü Reçber ve Hakan Şükür çıkmıyordu. Bu yüzden kullanılmadı.
- **Puan.** Listede bulunan isim sırası kadar puan getirir (10. sıra 10 puan, 1. sıra 1 puan); böylece az bilinen alt sıralar değerli. Yanlış, tekrar ya da süresi dolan tahmin bir can götürür. Her oyuncunun her listede 3 canı var; canı biten oyuncunun sırası atlanır, diğeri tek başına devam eder. Liste tamamlanınca ya da iki oyuncunun da canı bitince bütün liste değerleriyle açılır (6 saniye).
- **Süre.** Tahmin başına 20 saniye.
- **Bot.** Listenin zorluğa göre %30, %50 ya da %70'ini bilir, bildiklerini rastgele sırayla söyler; bildikleri bitince listenin hemen altındaki (11.–30. sıra) akla yatkın bir adı söyleyip can kaybeder.

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
- Erken sezonları eksik görünen oyuncular (veride ilk sezonu, doğum yılına göre beklenenden geç başlayanlar) "eksik kariyer" olarak işaretlenir. Bu işaret düelloda kullanılmıyor: Avrupa'ya geç gelen oyuncuları da (örnek: Mbaye Diagne) eksik saydığı için güvenilir çıkmadı.
- Vikiveri'den gelen sayılar yalnızca lig maçlarını kapsar; birinci kaynak bütün resmî maçları sayar. İki kaynaktan gelen oyuncular aynı soruda karşılaşabilir; bu fark şimdilik kabul edildi (bilinirliği 45 ve üzeri oyuncuların %20'si Vikiveri kaynaklı).
- Dakika verisi birinci kaynakta seyrek olduğu için kullanılmaz.

Risk: iki Transfermarkt türevi kaynak da üçüncü kişilerce kazınıp serbest lisansla yayımlanmıştır. Sayılar olgu olduğu için telif konusu olmaz, ama Transfermarkt'ın kullanım koşulları ve veritabanı hakkı açısından risk mevcut kaynağımızla aynı türdendir. Site doğrudan kazınmaz.

### Modların veri ihtiyacı

| Mod | Gereken | Durum |
|---|---|---|
| `duel` | Konsept üyeliği (kulüp, lig, uyruk), kariyer istatistikleri, piyasa değeri, millî maç, yaş | Hazır |
| `draft` | Kulüp üyeliği, mevki, kariyer istatistikleri | Hazır |
| `higher` | Piyasa değeri, millî maç, yaş, istatistik | Hazır ölçütlerle başlar |
| `chain` | Kulüp üyeliği | Hazır |
| `rare` | Izgara ölçütleri, bilinirlik puanı | Hazır |
| `auction` | Izgara ölçütleri, cevap listeleri | Hazır |
| `career` | Tarihli kulüp kayıtları | Hazır (uygulama veritabanında `player_club_years`) |
| `top-ten` | Sıralı listeler | Değer ve millî maç hazır; gol listeleri istatistikten sonra |

## Teknik yaklaşım

- **Kural motoru.** Her modun kuralları `packages/game-core` içinde saf fonksiyonlarla yazılır ve testleri orada durur.
- **Oturum protokolü.** XOX'un mesajları değişmez. Yeni modlar maç başında ve yeniden bağlanınca `session` (tam durum), her değişiklikten sonra `view` (oyuncunun görebildiği durum) alır; hamle `act` mesajıyla gider. Ayrıntı teknik mimaride.
- **Sunucu.** Her mod bir "oda üreticisi" verir (`RoomFactory`); lobi hangi modda olursa olsun aynı eşleştirme, arkadaş odası, kopma ve maç kaydı kurallarını uygular. Eşleştirme sırası mod, pazar ve zorluk başınadır.
- **Uygulama.** Ana ekranda oyun seçimi var. Her modun kendi ekranı vardır; bağlantı, arama ve hata ekranları ortaktır. Arkadaş odasına kodla katılan oyuncu modu bilmez; ekran sunucudan gelen ilk mesaja göre açılır.

## Yapım sırası

1. İstatistik aktarımı ve ortak oturum altyapısı. (Tamam)
2. Kart Düellosu. (Tamam)
3. Kadro Kur. (Tamam)
4. Hangisi Yüksek, Zincir. (Tamam)
5. En Az Bilinen, Açık Artırma. (Tamam)
6. İlk 10, Kariyer Yolu. (Tamam)

Her mod için bitti sayılma ölçütü: kural testleri, sunucu testleri (bot ve süre dolması dahil), emülatörde baştan sona bir maç.
