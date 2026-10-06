# Tasarım Dili: Gece Stadyumu

Son güncelleme: 7 Ekim 2026

Uygulama tek bir görünümle çalışır: koyu. Açık tema yoktur. Hava; gece maçı, projektör ışığı, skor tabelası.

Tüm değerler `app/src/constants/theme.ts` içindedir. Bileşenlerde renk ya da ölçü elle yazılmaz, oradan alınır.

## Renkler

| Ad | Değer | Kullanım |
|---|---|---|
| `background` | `#060A18` | Ekran zemini (gece göğü) |
| `backgroundDeep` | `#02040B` | Zemin geçişinin alt ucu |
| `surface` | `#0F1730` | Kartlar, boş hücreler, ikincil düğme |
| `surfaceRaised` | `#18223F` | Başlık hücreleri, basılı durum, seçili seçenek |
| `border` | `#2A3760` | Kenarlıklar, ayırıcılar |
| `text` | `#F4F8FF` | Ana metin |
| `textSecondary` | `#A9B5D1` | İkincil metin |
| `floodlight` | `#CFE6FF` | Projektör ışığı: başlık parlaması, vurgu metni |
| `pitch` | `#2EE59D` | Saha yeşili: ana düğme, seçim, odak |
| `sideX` | `#3DD6FF` | X tarafı |
| `sideO` | `#FFB020` | O tarafı |
| `positive` | `#2EE59D` | Doğru cevap |
| `negative` | `#FF5A6E` | Yanlış cevap, sürenin son saniyeleri |
| `gold` | `#FFD166` | Kazanan, uyarı |
| `onAccent` | `#06101F` | Canlı renkli zemin üstündeki metin |

Kurallar:

- Taraf renkleri yalnızca tarafları anlatır; düğme ya da uyarı için kullanılmaz.
- Kırmızı yalnızca hata ve süre uyarısıdır. Bu yüzden taraflardan biri kırmızı değildir.
- Bilgi yalnızca renkle verilmez: doğru ve yanlış geri bildirimi metinle de söylenir, sıradaki taraf yazıyla da gösterilir.
- Canlı renkli zeminlerde metin her zaman `onAccent` olur.

## Tipografi

| Rol | Yazı tipi | Boyut | Kullanım |
|---|---|---|---|
| `display` | Barlow Condensed Bold | 56 | Uygulama adı |
| `title` | Barlow Condensed Bold | 40 | Sonuç başlığı |
| `subtitle` | Barlow Condensed SemiBold | 28 | Sıra göstergesi |
| `score` | Barlow Condensed Bold | 32 | Skor ve sayaç rakamları |
| `label` | Barlow Condensed SemiBold | 15 | Düğme, başlık hücresi, etiket; büyük harf |
| `default` | Barlow Medium | 16 | Gövde metni |
| `small` | Barlow Medium | 14 | Açıklama |
| `smallBold` | Barlow Bold | 14 | Geri bildirim, hücredeki futbolcu adı |

- Barlow ailesi Türkçe karakterleri destekler.
- Büyük harfe çevirme uygulamanın diline göre yapılır (`useUppercase`); böylece Türkçede "i" harfi "İ" olur.
- Yazı tipleri açılışta yüklenir; yüklenene kadar açılış ekranı görünür.

## Boşluk, köşe ve dokunma

- Boşluk ölçeği: 2, 4, 8, 16, 24, 32, 64.
- Köşe yuvarlaklığı: 8 (küçük), 14 (orta), 22 (büyük).
- Dokunulabilir her öğe en az 48 birim yüksekliğindedir.
- İçerik genişliği en fazla 560 birimdir; tablette ortalanır.

## Zemin

Her ekranın arkasında Skia ile çizilen stadyum zemini vardır (`StadiumBackground`):

- Yukarıdan aşağıya koyulaşan gece göğü.
- Üst köşelerde iki projektör parlaması.
- Altta saha yeşili bir ışıma, orta çizgi ve orta yuvarlak.

Zemin durağandır; pil ve performans için hareket etmez.

## Bileşenler

| Bileşen | Kural |
|---|---|
| Ana düğme | Saha yeşili zemin, koyu metin, yeşil ışıma. Ekranda yalnızca bir tane olur |
| İkincil düğme | Yüzey rengi, ince kenarlık |
| Boş hücre | Yüzey rengi, ince kenarlık, ortada soluk artı. Basılınca kenarlık projektör rengine döner |
| Alınmış hücre | Tarafın rengiyle dolu, aynı renkte ışıma, koyu metinle futbolcu adı |
| Başlık hücresi | Yükseltilmiş yüzey, büyük harf etiket; ülkelerde bayrak |
| Skor paneli | Sırası gelen tarafın paneli kendi rengiyle çerçevelenir ve ışır |
| Sayaç | Skia ile çizilen halka; sırası gelen tarafın rengindedir, son 5 saniyede kırmızıya döner |
| Geri bildirim | Yüzey üstünde, durum renginde kenarlık ve metin |
| Arama penceresi | Aşağıdan açılır; giriş alanı saha yeşili kenarlıklı |

## Hareket

Süreler: 120 ms (basma), 220 ms (geçiş), 420 ms (giriş).

| An | Hareket |
|---|---|
| Düğmeye basma | %97'ye küçülür, bırakınca yaylanarak döner |
| Ana ekran açılışı | Bölümler sırayla aşağıdan belirir |
| Hücre alma | Hücre yaylanarak büyüyerek gelir |
| Sayaç | Halka süre boyunca kesintisiz azalır |
| Geri bildirim | Aşağıdan belirir, hızla kaybolur |
| Sonuç | Başlık yaylanarak gelir |
| Kazanma | Ekran ortasından renkli parçacık patlaması |

Kural: her hareket bir sebebi anlatır; süs için hareket eklenmez. Sistemde "hareketi azalt" açıksa giriş ve çıkış animasyonları kendiliğinden kapanır.

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
| Doğru cevap | Yükselen iki nota |
| Yanlış cevap | Alçalan kalın ses |
| Son 5 saniye | Tik |
| Kazanma | Kısa yükselen dizi |
| Beraberlik ya da kaybetme | Düdük |

Sesler `app/assets/sounds/` altındadır ve şimdilik kodla üretilmiş yer tutuculardır. Telefon sessizdeyse ses çalmaz.

## Erişilebilirlik

- Ana metin ve ikincil metin koyu zeminde 7:1'in üstünde kontrast verir.
- Her hücrenin ekran okuyucu etiketi satır ve sütun başlığını söyler; alınmış hücrede futbolcu adı da okunur.
- Geri bildirim alanı ekran okuyucuya değişikliği duyurur.
- Zorluk seçimi seçenek grubu olarak işaretlidir.

## Henüz yapılmayanlar

- Sesler yer tutucudur; gerçek ses tasarımı gerekiyor.
- Bayraklar emoji olarak gösteriliyor; platformlar arasında farklı görünür. Vektör bayrak setine geçilmeli.
- İkon seti seçilmedi; şu an ikon kullanılmıyor.
- Lottie henüz eklenmedi; hazır animasyon dosyası olduğunda eklenecek.
- Ses ve titreşimi kapatma ayarı yok.
- Oyuncu kartı bileşeni Adım 3'teki görsellerle birlikte tasarlanacak.
- Görünüm cihazda henüz incelenmedi; renk, boyut ve hız ayarları ilk incelemeden sonra yapılacak.
