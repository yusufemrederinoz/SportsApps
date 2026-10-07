# Tasarım Dili: Gece Stadyumu

Son güncelleme: 7 Ekim 2026 (ikinci sürüm)

Hedef çıta EA FC Ultimate Team: metalik oyuncu kartları, sinematik geçişler, premium futbol havası. Uygulama yalnızca koyu görünümle çalışır.

Tüm değerler `app/src/constants/theme.ts` içindedir. Bileşenlerde renk ya da ölçü elle yazılmaz.

## Sürüm geçmişi

| Sürüm | Ne oldu |
|---|---|
| Birinci | Koyu zemin, Barlow yazı tipi, düz kutulardan ızgara, birkaç giriş animasyonu. Değerlendirme: oyun gibi değil, animasyonlar zayıf, ızgara çekici değil, renk ve yazı oturmamış |
| İkinci | Metalik kart dili, ışık hüzmeli zemin, sinematik sonuç ekranı. Cihazda inceleme bekliyor |

Birinci sürümden çıkan ders: renk ve yazı tipini değiştirmek oyun hissi vermez. Oyunun merkezindeki nesne (hücre) kendi başına çekici bir şeye, burada oyuncu kartına dönüşmeli; her önemli an abartılı bir tepki vermeli.

## Renkler

| Ad | Değer | Kullanım |
|---|---|---|
| `ink` | `#05070A` | En koyu ton: zemin altı, boş hücre içi, sonuç perdesi |
| `background` | `#0A0D12` | Ekran zemini |
| `panel` | `#121821` | Paneller, arama satırları |
| `panelRaised` | `#1B2430` | Başlık plakaları, basılı durum |
| `stroke` | `#2B3644` | İnce kenarlık |
| `strokeBright` | `#5B6B80` | Belirgin kenarlık, pasif öğe |
| `text` | `#F6F8FB` | Ana metin |
| `textSecondary` | `#9BA8BA` | İkincil metin |
| `volt` | `#C8FF2E` | Marka vurgusu: seçili öğe, davet eden hücre, sayaç kutusu |
| `gold` | `#F3C653` | Kazanma, uyarı, mevki rozeti |
| `positive` | `#3BEA8B` | Doğru cevap |
| `negative` | `#FF4D6A` | Yanlış cevap, son saniyeler, kaybetme |

Taraflar renk değil "kaplama" taşır. Her kaplamanın dört tonu vardır: açık, ana, koyu ve mürekkep (üstündeki yazı rengi).

| Taraf | Kaplama | Açık | Ana | Koyu | Mürekkep |
|---|---|---|---|---|---|
| X | Altın | `#FFF1C2` | `#F3C653` | `#A8741A` | `#2E1E04` |
| O | Mavi | `#E3EEFF` | `#5B9BFF` | `#1D3FAF` | `#06153F` |

Kurallar:

- Metalik yüzeyler açık → ana → koyu geçişiyle boyanır, üst yarıda beyaz bir parlama ve açık tonda kenar çizgisi taşır.
- Volt yeşili yalnızca markayı ve "buraya dokun" çağrısını anlatır; taraf rengi olarak kullanılmaz.
- Kırmızı yalnızca hata, süre uyarısı ve kaybetmedir.
- Bilgi yalnızca renkle verilmez; her durum yazıyla da söylenir.

## Tipografi

| Rol | Yazı tipi | Boyut | Kullanım |
|---|---|---|---|
| `display` | Barlow Condensed ExtraBold Italic | 72 | Uygulama adı |
| `title` | Barlow Condensed ExtraBold Italic | 46 | Büyük başlıklar |
| `score` | Barlow Condensed ExtraBold Italic | 40 | Skor ve sayaç rakamları |
| `subtitle` | Barlow Condensed Bold | 26 | Sıra göstergesi |
| `label` | Barlow Condensed SemiBold | 15 | Etiketler; büyük harf, aralıklı |
| `default` | Barlow Medium | 16 | Gövde metni |
| `small` | Barlow Medium | 14 | Açıklama |
| `smallBold` | Barlow Bold | 14 | Vurgulu açıklama |

- Başlıklar büyük harf ve eğiktir; hareket ve hız hissi verir.
- Büyük harfe çevirme uygulamanın diline göre yapılır (`useUppercase`); Türkçede "i" harfi "İ" olur.

## Zemin

`StadiumBackground`, Skia ile çizilir:

- Yukarıdan aşağıya koyulaşan gece göğü.
- Üst köşelerden çapraz inen iki bulanık projektör hüzmesi; yavaşça nefes alır gibi parlayıp söner.
- Altta volt yeşili bir pus.
- Kenarlarda kararan bir çerçeve; bakışı ortaya toplar.

## Bileşenler

| Bileşen | Kural |
|---|---|
| Metal plaka (`MetalPlate`) | Köşesi kesik metalik yüzey. Kaplama verilirse metalik, verilmezse koyu çelik. Skor panelleri ve mod kartları bundan yapılır |
| Mod kartı | Ana ekrandaki büyük girişler: online maç neon, arkadaş odası çelik, bota karşı altın kaplama |
| İlerleme rozeti | Ana ekranın sol üstünde: neon zeminde seviye ("SV 3"), toplam puan ve sonraki seviyeye ince çubuk, yanında gol simgesi ve gol sayısı. Dokununca geçmiş ekranı açılır |
| Gol simgesi | Skia ile çizilmiş futbol topu (emoji değil). Gol miktarları altın renkle yazılır |
| Günlük ödül penceresi | Dönerek gelen büyük top, altın "+3", "3. GÜN", yedi günlük seri kutuları (bugün altın dolu), "Topla" düğmesi; açılışta başarı titreşimi ve ses |
| Onay penceresi | Karartılmış zemin üstünde metal levha: kırmızı başlık, açıklama, birincil "Maça devam et", ikincil "Maçı terk et". Güvenli seçenek birincildir |
| Ana ekran kutucukları | Kahraman yazının altında iki yan yana kutucuk: "Günün bulmacası #7" (üstte altın çizgi, altında durum: "9 hak", "3/9 · 240 puan", "Bitti · 640 puan") ve "Lider tablosu" (neon çizgi) |
| Lider tablosu satırı | Sıra dairesi (ilk üçte altın, gümüş, bronz), kullanıcı adı, koyu zeminde neon seviye etiketi ("SV 3"), sağda büyük puan. Oyuncunun kendi satırı neon çerçeveli; ilk 50'de değilse listenin altında "Senin sıran" başlığıyla durur |
| Bulmaca ekranı | Başlık ve neon numara etiketi ("#7"), dokuz hak noktası (kalan haklar neon), altın puan; XOX tahtası; dolu kartın sağ üstünde aynı cevabı verenlerin oranı ("%33"). Bitince neon metal levhada büyük puan, "1/9 · Bugün 12 kişi oynadı", altın gol rozeti, "Sonucu paylaş" ve günün sıralaması |
| Joker çubuğu | Skor tablosunun altında: solda "JOKER" ve kalan hak ("2 HAK", neon), yanında modun iki jokeri; her düğme altın çerçeveli, sağında küçük top ve fiyat ("3"). Kullanılamayan joker sönük. Altında açılan bilgi neon ("Uyruk: İngiltere"), rakibin jokeri altın satır, hata kırmızı. XOX'ta arama penceresinin altında, Kart Düellosu'nda elin altında durur |
| Maç sonu ödülü | Sonuç ekranında skorun altında: yeşil ya da kırmızı "+25 PUAN", altın çerçeveli "+1" gol, "Bu oyundaki puanın"; seviye atlanınca eğik neon "Yeni seviye" damgası |
| Zorluk seçici | Üç dilim; seçili olan volt dolgu ve ışıma |
| Izgara zemini | Tek bir Skia tuvali: başlık plakaları, boş yuvalar ve köşedeki üç renkli marka işareti |
| Başlık plakası | Koyu çelik, ince kenar, ızgaraya bakan kenarında volt çizgi |
| Boş yuva | Mürekkep rengi çukur. Sıra oyuncudaysa volt kenarı nabız gibi atar; seçiliyken kalın ve sabit yanar |
| Oyuncu kartı (`FootballerCard`) | Alınan hücre karta dönüşür: tarafın kaplaması, sağ üst köşe kesik, çapraz ışık şeritleri, sol üstte mevki ve bayrak, arkada soluk X ya da O, altta koyu şeritte oyuncu adı |
| Skor paneli | Sırası gelen taraf metalik ve ışıklı, diğeri koyu çelik. Skor artınca rakam sıçrar |
| Sayaç | Skia halkası; sıradaki tarafın rengindedir, son 5 saniyede kırmızıya döner ve her saniye atar |
| Geri bildirim damgası | Eğik, büyük yazı: "DOĞRU!", "YANLIŞ!", "SÜRE DOLDU!". Altında futbolcunun adı |
| Sonuç perdesi | Ekranı kaplar: dönen ışık hüzmeleri, çarparak gelen başlık, skor, düğmeler, konfeti |
| Ana düğme | Volt dolgu, koyu eğik yazı, belirli aralıklarla üstünden geçen parlama |
| Form ekranı (`FormScreen`) | Geri bağlantısı ve büyük başlık üstte, alanlar hemen altında. Klavye açılınca odaklanan alan yukarı kayar |
| Metin alanı (`TextField`) | Üstünde büyük harf etiket; odaklanınca etiket ve kenarlık volt olur |
| Şifre kuralları | Her kural bir satır; sağlanan kuralın işareti ve yazısı yeşile döner |
| Tanıtım | Üç sayfa: üstte örnek görsel, altta volt numara, eğik başlık ve kısa açıklama. Altta sayfa noktaları ve tek ana düğme |
| Karşılama | Uygulama adı üstte; altta bir ana düğme (misafir) ve iki ikincil düğme (giriş, hesap oluştur) |

## Hareket

Süreler: 120 ms (basma), 220 ms (geçiş), 420 ms (giriş), 700 ms (sinematik).

| An | Hareket |
|---|---|
| Ana ekran açılışı | Başlık soldan kayarak, bölümler sırayla aşağıdan gelir |
| Düğme ve kart basma | Küçülür, bırakınca yaylanır |
| Hücre alma | Kart büyük ve yan dönmüş hâlde gelir, yerine oturur; üstünden parlama geçer; hücreden halka ve kıvılcım saçılır |
| Yanlış cevap | Izgara sağa sola sarsılır |
| Sıra geçişi | Skor panellerinin kaplaması yer değiştirir, yuvaların nabzı başlar ya da durur |
| Son 5 saniye | Sayaç her saniye atar |
| Geri bildirim | Damga büyükten küçüğe çarparak gelir |
| Üçlü tamamlanınca | Kazanan üç kart nabız gibi atar ve parlama üstlerinden dönüp durur; diğer kartlar solar |
| Sonuç | Perde kararır, başlık çarparak gelir, skor ve düğmeler sırayla belirir; kazanınca konfeti yağar |

Kural: her hareket bir sebebi anlatır. Sistemde "hareketi azalt" açıksa giriş ve çıkış animasyonları kendiliğinden kapanır.

## Dokunsal geri bildirim

| An | Titreşim |
|---|---|
| Düğme, hücre, zorluk ve arama sonucu seçimi | Seçim |
| Doğru cevap | Başarı |
| Yanlış cevap, kullanılmış futbolcu | Hata |
| Süre doldu, bot cevap veremedi | Uyarı |
| Son 5 saniyenin her saniyesi | Hafif vuruş |
| Kazanma | Güçlü vuruş |
| Botun doğru cevabı | Hafif vuruş |

## Ses

| An | Ses |
|---|---|
| Maç başlangıcı | Düdük |
| Kart yerine oturunca | Tok vuruş; oyuncunun kendi doğrusunda ayrıca yükselen iki nota |
| Yanlış cevap | Alçalan kalın ses |
| Son 5 saniye | Tik |
| Sonuç perdesi | Hışırtı; kazanınca yükselen dizi, diğer durumlarda düdük |

Sesler `app/assets/sounds/` altındadır ve kodla üretilmiş yer tutuculardır. Telefon sessizdeyse ses çalmaz.

## Erişilebilirlik

- Ana ve ikincil metin koyu zeminde 7:1'in üstünde kontrast verir; metalik yüzeylerde yazı her zaman kaplamanın mürekkep tonudur.
- Dokunulabilir her öğe en az 48 birim yüksekliğindedir.
- Her hücrenin ekran okuyucu etiketi satır ve sütun başlığını söyler; alınmış hücrede futbolcu adı da okunur.
- Geri bildirim damgası ekran okuyucuya duyurulur.

## Henüz yapılmayanlar

- İkinci sürüm cihazda incelenmedi; boyut, renk ve hız ayarı ekran görüntülerine göre yapılacak.
- Kartlarda oyuncu görseli yok; Adım 3'teki çizgi film görselleri kartın ortasına gelecek.
- Android'de kart ve panel ışımaları görünmeyebilir; gerekirse ışıma Skia ile çizilecek.
- Sesler yer tutucu; gerçek ses tasarımı gerekiyor.
- Bayraklar emoji; vektör bayrak setine geçilmeli.
- Kulüp başlıklarında arma yok; yalnızca ad yazıyor.
- Ses ve titreşimi kapatma ayarı yok.
