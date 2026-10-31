# Mağaza Metinleri

Son güncelleme: 31 Ekim 2026 (sürüm 1.1.0)

Google Play ve App Store sayfalarındaki metinler. Bu dosya mağazada duranla aynı tutulur; mağazada bir şey değişirse burası da değişir. Sınırlar: Google Play'de ad 30, kısa açıklama 80, tam açıklama 4.000, sürüm notu 500 karakter. App Store'da ad ve alt başlık 30 karakter, anahtar kelimeler 100 bayt (Türkçe harfler iki bayt sayılır), tanıtım metni 170 karakter. Metinler altı dilde: Türkçe, İngilizce, Almanca, İspanyolca, Fransızca ve İtalyanca. Son dördü çeviridir; o dili bilen biri okumalı.

App Store ile Google Play'in tam açıklaması 16 Ekim 2026'dan beri ayrıdır. Apple 4.1(a) gerekçesiyle mağaza sayfasında lig adlarını ve kulüp armalarını andıran içeriği istemedi; App Store açıklaması lig adı ve arma cümlesi içermez, anahtar kelimelerde lig adı yoktur. 1.0.0'ın anahtar kelimelerinde "süper lig" hâlâ duruyordu; 1.1.0'da çıkarıldı.

## Mağaza görünürlüğü

31 Ekim 2026'ya kadar iki mağazada da yalnızca Türkçe sayfa vardı; ABD, İngiltere ve Almanya'daki kullanıcılar da Türkçe sayfayı görüyordu. 1.1.0 ile altı dil iki mağazaya girildi.

- **Hangi dil nerede taranır.** Apple'ın listesine göre Türkiye mağazasının varsayılan dili İngilizce (U.K.), Türkçe ek dildir; Almanya mağazası Almanca ile birlikte İngilizce (U.K.) da tarar. Bu yüzden App Store'da İngilizce iki ayrı kayıt var: İngilizce (U.K.) Türkiye, İngiltere ve Almanya'da, İngilizce (U.S.) ABD'de taranır. İngilizce (U.K.) anahtar kelimelerinde Türkiye için "futbol" da var; ad ve alt başlıktaki "Trivia" ve "Quiz" ile birleşip "futbol quiz" ve "futbol trivia" aramalarına girer.
- **ABD adı.** ABD'de "football trivia" araması Amerikan futbolu uygulamalarını getiriyor (ilk sıralarda NFL bilgi oyunları). Bu yüzden İngilizce (U.S.) App Store adı "Soccer Trivia"; Google Play'in İngilizce sayfası bütün İngilizce konuşulan ülkelerde göründüğü için orada "Football Trivia" kaldı.
- **Türkçe ad.** Kullanıcı "ChallengeGoal: Futbol Düellosu" adını korumayı seçti. Alt başlık en çok aranan ifadeyi tam taşısın diye "Futbol bilgi yarışması ve XOX" oldu.
- **Türkçe ekler.** Apple Türkçe ekleri eşlemiyor gibi görünüyor: alt başlıkta "oyunları" varken "futbol bilgi oyunu" aramasında, anahtar kelimede "yarışma" varken "futbol bilgi yarışması" aramasında yoktuk. Anahtar kelimeye aranan biçim yazılır ("oyunu", "soruları").
- **Tekrar yok.** Apple ad, alt başlık ve anahtar kelimeleri birleştirir; adda ya da alt başlıkta olan kelime anahtar kelimeye yazılmaz. Rakip uygulama adı (ör. "Tiki Taka Toe") anahtar kelimeye yazılmaz (kural 2.3.7).
- **Değişiklik zamanı.** App Store'da ad, alt başlık, anahtar kelime ve yeni dil yalnızca yeni sürümle değişir; tanıtım metni her an değişir. Google Play sayfası her an değişir.
- **Değerlendirme.** 31 Ekim'de App Store'da 2 değerlendirme vardı, öne çıkan rakiplerde 500 ile 1.900 arası. Uygulamada puan isteme penceresi yok; kullanıcı eklenmemesini seçti.

**Arama sırası ölçümü.** `node deploy/store_rank.mjs` Apple'ın açık arama servisiyle (iTunes Search API) aramalardaki sırayı yazar. Bu servis App Store aramasıyla birebir aynı değildir ama eğilimi gösterir. Google Play'in açık bir arama servisi yok.

| Arama (App Store Türkiye) | 31 Ekim 2026 (1.0.0) |
|---|---|
| challengegoal | 1 |
| futbol düellosu | 4 |
| futbol düello | 7 |
| futbol xox | 10 |
| futbol trivia | 50 |
| futbol bilgi | 66 |
| futbolcu tahmin | 66 |
| futbol quiz | 105 |
| futbol bilgi yarışması, futbol bilgi oyunu, futbol bulmaca, futbol soruları | ilk 180'de yok |

Google Play Türkiye'de aynı aramaların hiçbirinde ilk 30'da değildik; yalnızca "challengegoal" aramasında 1. sıradaydık. ABD, İngiltere ve Almanya'da İngilizce ve Almanca aramalarda hiç görünmüyorduk.

**1.1.0'dan sonra.** 1.1.0 App Store'da 31 Ekim 18.44'te (Türkiye saati) yayına girdi; Google Play'de aynı gün daha önce yayınlanmıştı. İki mağazanın açık sayfalarında yedi kaydın adı da doğru görünüyor (App Store'da Türkiye mağazası Türkçe ve İngilizce U.K. adını, Almanya mağazası Almanca ve İngilizce U.K. adını gösteriyor). Yayından yarım saat sonraki ölçümde App Store Türkiye sıraları yukarıdaki tabloyla birebir aynıydı: Apple yeni ad, alt başlık ve anahtar kelimeleri birkaç günde tarar, asıl ölçüm 2-3 Kasım'da yapılacak. Diğer ülkelerde yalnızca İspanya'da "quiz de fútbol" aramasında 51. sıradaydık. Google Play'de bütün aramalar aynı kaldı; adımızdaki "futbol düellosu" aramasında bile ilk 30'da değiliz. Google Play sıralamasında metinden çok indirme sayısı ve kullanıcıların uygulamada kalması belirleyici olduğu için oradaki sıra yeni kullanıcı geldikçe değişir.

## Türkçe (tr-TR, tr)

**Google Play adı**

```
ChallengeGoal: Futbol Düellosu
```

**Google Play kısa açıklaması**

```
8 futbol bilgi oyunu. Zorunlu reklam yok. Rakibini bul, puan topla, seviye atla.
```

**App Store adı**

```
ChallengeGoal: Futbol Düellosu
```

**App Store alt başlığı**

```
Futbol bilgi yarışması ve XOX
```

**App Store anahtar kelimeleri**

```
quiz,trivia,futbolcu,tahmin,oyunu,bulmaca,bilmece,soruları,düello,kariyer,online,arkadaş,grid
```

**App Store tanıtım metni**

```
8 futbol bilgi oyunu. Zorunlu reklam yok. Rakibini bul, rövanş iste, puan topla, seviye atla.
```

**Google Play tam açıklaması**

```
Futbolu kim daha iyi biliyor? ChallengeGoal sekiz oyunlu bir futbol bilgi yarışması. Online rakiplerle ya da arkadaşınla kapış, bilgini puana çevir.

ZORUNLU REKLAM YOK
Maçın ortasında reklam çıkmaz. Reklamı yalnızca sen istersen, gol kazanmak için izlersin.

SEKİZ OYUN, TEK UYGULAMA
• XOX: Satır ve sütundaki iki ölçüte uyan futbolcuyu yaz, üç hücreyi yan yana getir.
• Kart Düellosu: Konsepte uyan 7 futbolcunu seç. Sorular gizli; her turda bir kartını rakibinkiyle kapıştır.
• Kadro Kur: Her turda çıkan kulüpten bir oyuncu al, hedef istatistikte en güçlü kadroyu kur.
• Hangisi Yüksek: İki futbolcu, bir ölçüt. Değeri yüksek olanı bil, seriyi sürdür.
• Zincir: Bir öncekiyle aynı kulüpte oynamış bir futbolcu söyle. Zinciri koparan turu kaybeder.
• Açık Artırma: Kaç cevap sayabileceğini söyle, artır. Rakibin "say bakalım" derse saymak zorundasın.
• İlk 10: Listedeki adları sırayla bulun. Listede olmayan ad can götürür.
• Kariyer Yolu: Kulüpler kariyer sırasıyla açılır. Futbolcuyu en az ipucuyla bilen kazanır.

HER ZAMAN BİR MAÇ VAR
• Online eşleşme: Oyununu ve zorluğunu seç, saniyeler içinde maça gir.
• Arkadaşınla oyna: Bir oda kur, kodu paylaş.
• Rövanş: Online ya da arkadaş maçı bitince aynı rakibe rövanş teklif et.
• Tepkiler: Maç sırasında rakibine maskotlu tepkiler gönder, gerekirse kırmızı kart göster.
• Günün bulmacası: Her gün herkese aynı ızgara. Cevabın ne kadar az bilinirse o kadar çok puan alırsın.
• Bota karşı: Isınmak istediğinde beklemeden oyna.

PUAN TOPLA, SEVİYE ATLA
• Her oyunda ayrı puan toplarsın; ulaştığın seviye hiç düşmez.
• Haftalık ve tüm zamanlar lider tablolarında yerini al.
• Günlük ödül serini büyüt, maç içinde jokerlerini kullan.
• Puanlı bir maçı kaybettin mi? Puanını reklam izleyerek ya da 5 golle geri al.

GENİŞ FUTBOL VERİSİ
Süper Lig ve Avrupa'nın beş büyük liginde oynamış 70 binden fazla futbolcu ve 19 ligden 500'den fazla kulüp. Türkçe, İngilizce, Almanca, İspanyolca, Fransızca ve İtalyanca oynanır.

BİLMEN GEREKENLER
• Uygulama ücretsizdir; isteğe bağlı ödüllü reklam ve uygulama içi satın alma içerir. Jokerler ve puan koruma için harcanan goller oynayarak, günlük ödülle ya da reklam izleyerek de kazanılır.
• Online maçlar, günün bulmacası ve lider tablosu için internet gerekir. XOX'u bota karşı internetsiz de oynayabilirsin.
• ChallengeGoal hiçbir kulüp, lig, federasyon ya da futbolcuyla bağlantılı değildir. Kulüp armaları özgün çizimlerdir; futbolcu görselleri yapay zekâ ile üretilmiş çizimlerdir, gerçek fotoğraf değildir.

Destek: destek@challengegoal.app
```

**App Store tam açıklaması**

```
Futbolu kim daha iyi biliyor? ChallengeGoal sekiz oyunlu bir futbol bilgi yarışması. Online rakiplerle ya da arkadaşınla kapış, bilgini puana çevir.

ZORUNLU REKLAM YOK
Maçın ortasında reklam çıkmaz. Reklamı yalnızca sen istersen, gol kazanmak için izlersin.

SEKİZ OYUN, TEK UYGULAMA
• XOX: Satır ve sütundaki iki ölçüte uyan futbolcuyu yaz, üç hücreyi yan yana getir.
• Kart Düellosu: Konsepte uyan 7 futbolcunu seç. Sorular gizli; her turda bir kartını rakibinkiyle kapıştır.
• Kadro Kur: Her turda çıkan kulüpten bir oyuncu al, hedef istatistikte en güçlü kadroyu kur.
• Hangisi Yüksek: İki futbolcu, bir ölçüt. Değeri yüksek olanı bil, seriyi sürdür.
• Zincir: Bir öncekiyle aynı kulüpte oynamış bir futbolcu söyle. Zinciri koparan turu kaybeder.
• Açık Artırma: Kaç cevap sayabileceğini söyle, artır. Rakibin "say bakalım" derse saymak zorundasın.
• İlk 10: Listedeki adları sırayla bulun. Listede olmayan ad can götürür.
• Kariyer Yolu: Kulüpler kariyer sırasıyla açılır. Futbolcuyu en az ipucuyla bilen kazanır.

HER ZAMAN BİR MAÇ VAR
• Online eşleşme: Oyununu ve zorluğunu seç, saniyeler içinde maça gir.
• Arkadaşınla oyna: Bir oda kur, kodu paylaş.
• Rövanş: Online ya da arkadaş maçı bitince aynı rakibe rövanş teklif et.
• Tepkiler: Maç sırasında rakibine maskotlu tepkiler gönder, gerekirse kırmızı kart göster.
• Günün bulmacası: Her gün herkese aynı ızgara. Cevabın ne kadar az bilinirse o kadar çok puan alırsın.
• Bota karşı: Isınmak istediğinde beklemeden oyna.

PUAN TOPLA, SEVİYE ATLA
• Her oyunda ayrı puan toplarsın; ulaştığın seviye hiç düşmez.
• Haftalık ve tüm zamanlar lider tablolarında yerini al.
• Günlük ödül serini büyüt, maç içinde jokerlerini kullan.
• Puanlı bir maçı kaybettin mi? Puanını reklam izleyerek ya da 5 golle geri al.

GENİŞ FUTBOL VERİSİ
70 binden fazla futbolcu ve 500'den fazla kulüp. Türkçe, İngilizce, Almanca, İspanyolca, Fransızca ve İtalyanca oynanır.

BİLMEN GEREKENLER
• Uygulama ücretsizdir; isteğe bağlı ödüllü reklam ve uygulama içi satın alma içerir. Jokerler ve puan koruma için harcanan goller oynayarak, günlük ödülle ya da reklam izleyerek de kazanılır.
• Online maçlar, günün bulmacası ve lider tablosu için internet gerekir. XOX'u bota karşı internetsiz de oynayabilirsin.
• ChallengeGoal hiçbir kulüp, lig, federasyon ya da futbolcuyla bağlantılı değildir. Futbolcu görselleri yapay zekâ ile üretilmiş çizimlerdir, gerçek fotoğraf değildir.

Destek: destek@challengegoal.app
```

**1.1.0 sürüm notu** (iki mağazada aynı)

```
• Rövanş: Online ya da arkadaş maçı bitince aynı rakibe rövanş teklif et.
• Tepkiler: Maç sırasında rakibine maskotlu tepkiler gönder.
• Jokerler artık futbolcu arama ekranında da görünüyor. Süre bitmek üzereyken büyük bir +15 saniye düğmesi çıkıyor.
• Kaybettiğin maçın puanını artık 5 golle de geri alabilirsin.
• Zincir'de 13 yeni ligin kulüpleri de bağlantı sayılıyor.
```

## İngilizce (en-US, en-GB)

**Google Play adı**

```
ChallengeGoal: Football Trivia
```

**Google Play kısa açıklaması**

```
8 football trivia games. No forced ads. Find a rival, collect points, level up.
```

**App Store adı (en-GB)**

```
ChallengeGoal: Football Trivia
```

**App Store alt başlığı (en-GB)**

```
Quiz, grid and online duels
```

**App Store anahtar kelimeleri (en-GB)**

```
futbol,soccer,footy,tic,tac,toe,xox,guess,player,footballer,career,lineup,daily,puzzle,friends,duel
```

**App Store tanıtım metni (en-GB)**

```
8 football trivia games. No forced ads. Find a rival, ask for a rematch, collect points, level up.
```

**App Store adı (en-US)**

```
ChallengeGoal: Soccer Trivia
```

**App Store alt başlığı (en-US)**

```
Football quiz, grid and duels
```

**App Store anahtar kelimeleri (en-US)**

```
tic,tac,toe,xox,guess,player,footballer,career,lineup,daily,puzzle,online,friends,duel,futbol,sports
```

**App Store tanıtım metni (en-US)**

```
8 soccer trivia games. No forced ads. Find a rival, ask for a rematch, collect points, level up.
```

**Google Play tam açıklaması**

```
Who knows football better? ChallengeGoal is a football trivia app with eight games. Take on online opponents or a friend and turn what you know into points.

NO FORCED ADS
No ad pops up in the middle of a match. You only watch an ad when you choose to, to earn goals.

EIGHT GAMES, ONE APP
• XOX: Name a footballer who fits both the row and the column, and line up three cells.
• Card Duel: Pick 7 footballers who fit the theme. The questions are hidden; play one card against your opponent's each round.
• Lineup Draft: Take one player from the club of each round and build the strongest squad for the target stat.
• Higher or Lower: Two footballers, one measure. Pick the higher one and keep your streak.
• Club Chain: Name a footballer who shared a club with the previous one. Break the chain and you lose the round.
• Answer Auction: Say how many answers you can name and raise. If your opponent calls it, you have to name them.
• Top Ten: Take turns finding the names on the list. A name that is not on it costs a life.
• Career Path: Clubs appear in career order. Whoever names the footballer with the fewest clues wins.

A MATCH IS ALWAYS READY
• Online matches: Pick a game and a level and get a match within seconds.
• Play a friend: Open a room and share the code.
• Rematch: When an online or friend match ends, offer the same opponent a rematch.
• Reactions: Send your opponent mascot reactions during the match, or show them a red card.
• Daily puzzle: The same grid for everyone, every day. The rarer your answer, the more points you get.
• Against the bot: Play without waiting whenever you want to warm up.

COLLECT POINTS, LEVEL UP
• You collect points in every game, and a level you reach never drops.
• Take your place on the weekly and all-time leaderboards.
• Grow your daily reward streak and use jokers during matches.
• Lost a ranked match? Win the points back by watching an ad or paying 5 goals.

A LOT OF FOOTBALL
More than 70,000 footballers who played in the Turkish Süper Lig or Europe's five big leagues, and more than 500 clubs from 19 leagues. Play in English, German, Spanish, French, Italian or Turkish.

GOOD TO KNOW
• The app is free; it contains ads and in-app purchases. Goals, which you spend on jokers and point protection, can also be earned by playing, with the daily reward or by watching an ad.
• Online matches, the daily puzzle and the leaderboard need an internet connection. You can play XOX against the bot offline.
• ChallengeGoal is not affiliated with any club, league, federation or footballer. Club crests are original drawings; footballer images are AI-generated illustrations, not real photographs.

Support: destek@challengegoal.app
```

**App Store tam açıklaması**

```
Who knows football better? ChallengeGoal is a football trivia app with eight games. Take on online opponents or a friend and turn what you know into points.

NO FORCED ADS
No ad pops up in the middle of a match. You only watch an ad when you choose to, to earn goals.

EIGHT GAMES, ONE APP
• XOX: Name a footballer who fits both the row and the column, and line up three cells.
• Card Duel: Pick 7 footballers who fit the theme. The questions are hidden; play one card against your opponent's each round.
• Lineup Draft: Take one player from the club of each round and build the strongest squad for the target stat.
• Higher or Lower: Two footballers, one measure. Pick the higher one and keep your streak.
• Club Chain: Name a footballer who shared a club with the previous one. Break the chain and you lose the round.
• Answer Auction: Say how many answers you can name and raise. If your opponent calls it, you have to name them.
• Top Ten: Take turns finding the names on the list. A name that is not on it costs a life.
• Career Path: Clubs appear in career order. Whoever names the footballer with the fewest clues wins.

A MATCH IS ALWAYS READY
• Online matches: Pick a game and a level and get a match within seconds.
• Play a friend: Open a room and share the code.
• Rematch: When an online or friend match ends, offer the same opponent a rematch.
• Reactions: Send your opponent mascot reactions during the match, or show them a red card.
• Daily puzzle: The same grid for everyone, every day. The rarer your answer, the more points you get.
• Against the bot: Play without waiting whenever you want to warm up.

COLLECT POINTS, LEVEL UP
• You collect points in every game, and a level you reach never drops.
• Take your place on the weekly and all-time leaderboards.
• Grow your daily reward streak and use jokers during matches.
• Lost a ranked match? Win the points back by watching an ad or paying 5 goals.

A LOT OF FOOTBALL
More than 70,000 footballers and more than 500 clubs. Play in English, German, Spanish, French, Italian or Turkish.

GOOD TO KNOW
• The app is free; it contains ads and in-app purchases. Goals, which you spend on jokers and point protection, can also be earned by playing, with the daily reward or by watching an ad.
• Online matches, the daily puzzle and the leaderboard need an internet connection. You can play XOX against the bot offline.
• ChallengeGoal is not affiliated with any club, league, federation or footballer. Footballer images are AI-generated illustrations, not real photographs.

Support: destek@challengegoal.app
```

**1.1.0 sürüm notu** (iki mağazada aynı)

```
• Rematch: When an online or friend match ends, offer the same opponent a rematch.
• Reactions: Send your opponent mascot reactions during the match.
• Jokers now also show on the footballer search screen, and a big +15 seconds button appears when time is running out.
• You can now also win back the points of a lost match with 5 goals.
• Club Chain now counts clubs from 13 more leagues.
```

## Almanca (de-DE)

**Google Play adı**

```
ChallengeGoal: Fußball-Quiz
```

**Google Play kısa açıklaması**

```
8 Fußball-Quizspiele ohne Zwangswerbung. Finde Gegner, hol Punkte, steig auf.
```

**App Store adı**

```
ChallengeGoal: Fußball-Quiz
```

**App Store alt başlığı**

```
Tagesrätsel und Online-Duelle
```

**App Store anahtar kelimeleri**

```
fussball,trivia,xox,tic,tac,toe,spieler,fußballer,karriere,kader,duell,match,raten,wissen,raster
```

**App Store tanıtım metni**

```
8 Fußball-Quizspiele ohne Zwangswerbung. Finde Gegner, fordere eine Revanche, hol Punkte, steig auf.
```

**Google Play tam açıklaması**

```
Wer kennt Fußball besser? ChallengeGoal ist ein Fußball-Quiz mit acht Spielen. Tritt gegen Online-Gegner oder gegen Freunde an und mach aus deinem Wissen Punkte.

KEINE ZWANGSWERBUNG
Mitten im Match erscheint keine Werbung. Werbung siehst du nur, wenn du es willst, um Tore zu verdienen.

ACHT SPIELE, EINE APP
• XOX: Nenn einen Fußballer, der zu Zeile und Spalte passt, und bring drei Felder in eine Reihe.
• Kartenduell: Wähl 7 Fußballer, die zum Thema passen. Die Fragen sind geheim; in jeder Runde spielst du eine Karte gegen die deines Gegners.
• Kader-Draft: Hol dir in jeder Runde einen Spieler vom Verein der Runde und stell den stärksten Kader für den Zielwert zusammen.
• Höher oder tiefer: Zwei Fußballer, ein Wert. Tipp auf den höheren und halt deine Serie am Laufen.
• Vereinskette: Nenn einen Fußballer, der beim selben Verein gespielt hat wie der vorherige. Wer die Kette reißen lässt, verliert die Runde.
• Antwort-Auktion: Sag, wie viele Antworten du nennen kannst, und erhöh. Sagt dein Gegner „Beweis es“, musst du sie nennen.
• Top 10: Findet abwechselnd die Namen auf der Liste. Ein Name, der nicht draufsteht, kostet ein Leben.
• Karriereweg: Die Vereine erscheinen in der Reihenfolge der Karriere. Wer den Fußballer mit den wenigsten Hinweisen errät, gewinnt.

ES GIBT IMMER EIN MATCH
• Online-Matches: Wähl Spiel und Schwierigkeit und sei in Sekunden im Match.
• Gegen Freunde: Eröffne einen Raum und teil den Code.
• Revanche: Ist ein Online- oder Freundesmatch vorbei, biete demselben Gegner eine Revanche an.
• Reaktionen: Schick deinem Gegner im Match Maskottchen-Reaktionen oder zeig ihm die Rote Karte.
• Tagesrätsel: Jeden Tag das gleiche Raster für alle. Je seltener deine Antwort, desto mehr Punkte.
• Gegen den Bot: Spiel ohne Wartezeit, wann immer du dich warmspielen willst.

PUNKTE HOLEN, AUFSTEIGEN
• Du sammelst in jedem Spiel Punkte, und ein erreichtes Level verlierst du nie.
• Sichere dir deinen Platz in der Wochen- und der Allzeit-Rangliste.
• Bau deine Tagesbonus-Serie aus und setz im Match Joker ein.
• Ein gewertetes Match verloren? Hol dir die Punkte mit einer Werbung oder für 5 Tore zurück.

JEDE MENGE FUSSBALL
Mehr als 70.000 Fußballer, die in der türkischen Süper Lig oder in den fünf großen Ligen Europas gespielt haben, und über 500 Vereine aus 19 Ligen. Spielbar auf Deutsch, Englisch, Spanisch, Französisch, Italienisch und Türkisch.

GUT ZU WISSEN
• Die App ist kostenlos; sie enthält Werbung und In-App-Käufe. Tore, die du für Joker und Punkteschutz ausgibst, bekommst du auch durchs Spielen, über den Tagesbonus oder für eine angesehene Werbung.
• Online-Matches, Tagesrätsel und Rangliste brauchen eine Internetverbindung. XOX gegen den Bot kannst du auch offline spielen.
• ChallengeGoal steht in keiner Verbindung zu Vereinen, Ligen, Verbänden oder Fußballern. Die Vereinswappen sind eigene Zeichnungen; die Fußballerbilder sind KI-generierte Illustrationen, keine echten Fotos.

Support: destek@challengegoal.app
```

**App Store tam açıklaması**

```
Wer kennt Fußball besser? ChallengeGoal ist ein Fußball-Quiz mit acht Spielen. Tritt gegen Online-Gegner oder gegen Freunde an und mach aus deinem Wissen Punkte.

KEINE ZWANGSWERBUNG
Mitten im Match erscheint keine Werbung. Werbung siehst du nur, wenn du es willst, um Tore zu verdienen.

ACHT SPIELE, EINE APP
• XOX: Nenn einen Fußballer, der zu Zeile und Spalte passt, und bring drei Felder in eine Reihe.
• Kartenduell: Wähl 7 Fußballer, die zum Thema passen. Die Fragen sind geheim; in jeder Runde spielst du eine Karte gegen die deines Gegners.
• Kader-Draft: Hol dir in jeder Runde einen Spieler vom Verein der Runde und stell den stärksten Kader für den Zielwert zusammen.
• Höher oder tiefer: Zwei Fußballer, ein Wert. Tipp auf den höheren und halt deine Serie am Laufen.
• Vereinskette: Nenn einen Fußballer, der beim selben Verein gespielt hat wie der vorherige. Wer die Kette reißen lässt, verliert die Runde.
• Antwort-Auktion: Sag, wie viele Antworten du nennen kannst, und erhöh. Sagt dein Gegner „Beweis es“, musst du sie nennen.
• Top 10: Findet abwechselnd die Namen auf der Liste. Ein Name, der nicht draufsteht, kostet ein Leben.
• Karriereweg: Die Vereine erscheinen in der Reihenfolge der Karriere. Wer den Fußballer mit den wenigsten Hinweisen errät, gewinnt.

ES GIBT IMMER EIN MATCH
• Online-Matches: Wähl Spiel und Schwierigkeit und sei in Sekunden im Match.
• Gegen Freunde: Eröffne einen Raum und teil den Code.
• Revanche: Ist ein Online- oder Freundesmatch vorbei, biete demselben Gegner eine Revanche an.
• Reaktionen: Schick deinem Gegner im Match Maskottchen-Reaktionen oder zeig ihm die Rote Karte.
• Tagesrätsel: Jeden Tag das gleiche Raster für alle. Je seltener deine Antwort, desto mehr Punkte.
• Gegen den Bot: Spiel ohne Wartezeit, wann immer du dich warmspielen willst.

PUNKTE HOLEN, AUFSTEIGEN
• Du sammelst in jedem Spiel Punkte, und ein erreichtes Level verlierst du nie.
• Sichere dir deinen Platz in der Wochen- und der Allzeit-Rangliste.
• Bau deine Tagesbonus-Serie aus und setz im Match Joker ein.
• Ein gewertetes Match verloren? Hol dir die Punkte mit einer Werbung oder für 5 Tore zurück.

JEDE MENGE FUSSBALL
Mehr als 70.000 Fußballer und über 500 Vereine. Spielbar auf Deutsch, Englisch, Spanisch, Französisch, Italienisch und Türkisch.

GUT ZU WISSEN
• Die App ist kostenlos; sie enthält Werbung und In-App-Käufe. Tore, die du für Joker und Punkteschutz ausgibst, bekommst du auch durchs Spielen, über den Tagesbonus oder für eine angesehene Werbung.
• Online-Matches, Tagesrätsel und Rangliste brauchen eine Internetverbindung. XOX gegen den Bot kannst du auch offline spielen.
• ChallengeGoal steht in keiner Verbindung zu Vereinen, Ligen, Verbänden oder Fußballern. Die Fußballerbilder sind KI-generierte Illustrationen, keine echten Fotos.

Support: destek@challengegoal.app
```

**1.1.0 sürüm notu** (iki mağazada aynı)

```
• Revanche: Ist ein Online- oder Freundesmatch vorbei, kannst du demselben Gegner eine Revanche anbieten.
• Reaktionen: Schick deinem Gegner im Match Maskottchen-Reaktionen.
• Joker gibt es jetzt auch in der Spielersuche, und kurz vor Ablauf der Zeit erscheint ein großer +15-Sekunden-Knopf.
• Die Punkte eines verlorenen Matches holst du dir jetzt auch für 5 Tore zurück.
• In der Vereinskette zählen jetzt auch Vereine aus 13 weiteren Ligen.
```

## İspanyolca (es-ES)

**Google Play adı**

```
ChallengeGoal: Quiz de Fútbol
```

**Google Play kısa açıklaması**

```
8 juegos de trivia de fútbol sin anuncios obligatorios. Suma puntos y sube.
```

**App Store adı**

```
ChallengeGoal: Quiz de Fútbol
```

**App Store alt başlığı**

```
Reto diario y duelos online
```

**App Store anahtar kelimeleri**

```
futbol,trivia,trivial,tres,raya,futbolistas,futbolista,carrera,alineación,duelo,adivina,preguntas
```

**App Store tanıtım metni**

```
8 juegos de trivia de fútbol sin anuncios obligatorios. Encuentra rival, pide la revancha, suma puntos y sube de nivel.
```

**Google Play tam açıklaması**

```
¿Quién sabe más de fútbol? ChallengeGoal es un quiz de fútbol con ocho juegos. Mídete con rivales online o con un amigo y convierte lo que sabes en puntos.

SIN ANUNCIOS OBLIGATORIOS
No aparecen anuncios en mitad de un partido. Solo ves un anuncio cuando tú quieres, para ganar goles.

OCHO JUEGOS, UNA APP
• XOX: Escribe un futbolista que encaje con la fila y la columna, y haz tres en raya.
• Duelo de Cartas: Elige 7 futbolistas que encajen con el tema. Las preguntas son secretas; en cada ronda juegas una carta contra la de tu rival.
• Draft de Alineación: Ficha a un jugador del club de cada ronda y monta el equipo más fuerte en la estadística objetivo.
• Mayor o Menor: Dos futbolistas, un criterio. Elige al que gana y mantén la racha.
• Cadena de Clubes: Di un futbolista que haya compartido club con el anterior. Si rompes la cadena, pierdes la ronda.
• Subasta de Respuestas: Di cuántas respuestas te sabes y sube la puja. Si tu rival te dice «demuéstralo», tienes que decirlas.
• Top 10: Por turnos, hay que encontrar los nombres de la lista. Un nombre que no esté en ella cuesta una vida.
• Trayectoria: Los clubes aparecen en el orden de su carrera. Gana quien acierte el futbolista con menos pistas.

SIEMPRE HAY PARTIDO
• Partidos online: Elige juego y dificultad y entra en un partido en segundos.
• Jugar con un amigo: Crea una sala y comparte el código.
• Revancha: Cuando acaba un partido online o con un amigo, ofrece la revancha al mismo rival.
• Reacciones: Envía a tu rival reacciones de la mascota durante el partido o sácale la tarjeta roja.
• Reto diario: El mismo tablero para todos, cada día. Cuanto menos repetida sea tu respuesta, más puntos te llevas.
• Contra el bot: Juega sin esperas cuando quieras calentar.

SUMA PUNTOS, SUBE DE NIVEL
• Sumas puntos en cada juego, y un nivel alcanzado nunca baja.
• Hazte un hueco en las clasificaciones semanal e histórica.
• Alarga tu racha de recompensas diarias y usa comodines durante los partidos.
• ¿Has perdido un partido con puntos en juego? Recupera los puntos viendo un anuncio o pagando 5 goles.

MUCHO FÚTBOL
Más de 70.000 futbolistas que han jugado en la Süper Lig turca o en las cinco grandes ligas de Europa, y más de 500 clubes de 19 ligas. Juega en español, inglés, alemán, francés, italiano o turco.

A TENER EN CUENTA
• La app es gratuita; contiene anuncios y compras dentro de la app. Los goles, que gastas en comodines y en proteger tus puntos, también se consiguen jugando, con la recompensa diaria o viendo un anuncio.
• Los partidos online, el reto diario y la clasificación necesitan conexión a internet. Al XOX contra el bot puedes jugar sin conexión.
• ChallengeGoal no está afiliado a ningún club, liga, federación ni futbolista. Los escudos de los clubes son dibujos originales; las imágenes de los futbolistas son ilustraciones generadas con IA, no fotografías reales.

Soporte: destek@challengegoal.app
```

**App Store tam açıklaması**

```
¿Quién sabe más de fútbol? ChallengeGoal es un quiz de fútbol con ocho juegos. Mídete con rivales online o con un amigo y convierte lo que sabes en puntos.

SIN ANUNCIOS OBLIGATORIOS
No aparecen anuncios en mitad de un partido. Solo ves un anuncio cuando tú quieres, para ganar goles.

OCHO JUEGOS, UNA APP
• XOX: Escribe un futbolista que encaje con la fila y la columna, y haz tres en raya.
• Duelo de Cartas: Elige 7 futbolistas que encajen con el tema. Las preguntas son secretas; en cada ronda juegas una carta contra la de tu rival.
• Draft de Alineación: Ficha a un jugador del club de cada ronda y monta el equipo más fuerte en la estadística objetivo.
• Mayor o Menor: Dos futbolistas, un criterio. Elige al que gana y mantén la racha.
• Cadena de Clubes: Di un futbolista que haya compartido club con el anterior. Si rompes la cadena, pierdes la ronda.
• Subasta de Respuestas: Di cuántas respuestas te sabes y sube la puja. Si tu rival te dice «demuéstralo», tienes que decirlas.
• Top 10: Por turnos, hay que encontrar los nombres de la lista. Un nombre que no esté en ella cuesta una vida.
• Trayectoria: Los clubes aparecen en el orden de su carrera. Gana quien acierte el futbolista con menos pistas.

SIEMPRE HAY PARTIDO
• Partidos online: Elige juego y dificultad y entra en un partido en segundos.
• Jugar con un amigo: Crea una sala y comparte el código.
• Revancha: Cuando acaba un partido online o con un amigo, ofrece la revancha al mismo rival.
• Reacciones: Envía a tu rival reacciones de la mascota durante el partido o sácale la tarjeta roja.
• Reto diario: El mismo tablero para todos, cada día. Cuanto menos repetida sea tu respuesta, más puntos te llevas.
• Contra el bot: Juega sin esperas cuando quieras calentar.

SUMA PUNTOS, SUBE DE NIVEL
• Sumas puntos en cada juego, y un nivel alcanzado nunca baja.
• Hazte un hueco en las clasificaciones semanal e histórica.
• Alarga tu racha de recompensas diarias y usa comodines durante los partidos.
• ¿Has perdido un partido con puntos en juego? Recupera los puntos viendo un anuncio o pagando 5 goles.

MUCHO FÚTBOL
Más de 70.000 futbolistas y más de 500 clubes. Juega en español, inglés, alemán, francés, italiano o turco.

A TENER EN CUENTA
• La app es gratuita; contiene anuncios y compras dentro de la app. Los goles, que gastas en comodines y en proteger tus puntos, también se consiguen jugando, con la recompensa diaria o viendo un anuncio.
• Los partidos online, el reto diario y la clasificación necesitan conexión a internet. Al XOX contra el bot puedes jugar sin conexión.
• ChallengeGoal no está afiliado a ningún club, liga, federación ni futbolista. Las imágenes de los futbolistas son ilustraciones generadas con IA, no fotografías reales.

Soporte: destek@challengegoal.app
```

**1.1.0 sürüm notu** (iki mağazada aynı)

```
• Revancha: Cuando acaba un partido online o con un amigo, puedes ofrecer la revancha al mismo rival.
• Reacciones: Envía a tu rival reacciones de la mascota durante el partido.
• Los comodines también aparecen en la búsqueda de futbolistas, y cuando se acaba el tiempo sale un botón grande de +15 segundos.
• Ahora también puedes recuperar los puntos de un partido perdido con 5 goles.
• En Cadena de Clubes cuentan también los clubes de 13 ligas más.
```

## Fransızca (fr-FR)

**Google Play adı**

```
ChallengeGoal : Quiz Foot
```

**Google Play kısa açıklaması**

```
8 jeux de quiz foot sans pub imposée. Trouve un adversaire, marque des points.
```

**App Store adı**

```
ChallengeGoal : Quiz Foot
```

**App Store alt başlığı**

```
Défi du jour et duels en ligne
```

**App Store anahtar kelimeleri**

```
football,culture,morpion,xox,joueurs,footballeur,carrière,compo,duel,match,deviner,questions,jeu
```

**App Store tanıtım metni**

```
8 jeux de quiz foot sans pub imposée. Trouve un adversaire, demande ta revanche, marque des points.
```

**Google Play tam açıklaması**

```
Qui connaît le mieux le foot ? ChallengeGoal est un quiz foot avec huit jeux. Affronte des adversaires en ligne ou un ami et transforme ta culture foot en points.

PAS DE PUB IMPOSÉE
Aucune pub ne s'affiche en plein match. Tu regardes une pub uniquement si tu le veux, pour gagner des buts.

HUIT JEUX, UNE SEULE APPLI
• XOX : Trouve un footballeur qui correspond à la ligne et à la colonne, et aligne trois cases.
• Duel de cartes : Choisis 7 footballeurs qui collent au thème. Les questions sont cachées ; à chaque manche, joue une carte contre celle de ton adversaire.
• Fais ta compo : Prends un joueur du club de chaque manche et monte l'effectif le plus fort sur la stat visée.
• Plus ou moins : Deux footballeurs, un critère. Choisis le plus élevé et garde ta série.
• Chaîne de clubs : Cite un footballeur passé par le même club que le précédent. Si tu casses la chaîne, tu perds la manche.
• Enchères : Annonce combien de réponses tu peux citer, puis surenchéris. Si ton adversaire te lance « Prouve-le », tu dois les citer.
• Top 10 : À tour de rôle, retrouvez les noms de la liste. Un nom qui n'y figure pas coûte une vie.
• Parcours de carrière : Les clubs apparaissent dans l'ordre de la carrière. Celui qui trouve le footballeur avec le moins d'indices gagne.

IL Y A TOUJOURS UN MATCH À JOUER
• Matchs en ligne : Choisis un jeu et une difficulté, et lance un match en quelques secondes.
• Défier un ami : Ouvre un salon et partage le code.
• Revanche : À la fin d'un match en ligne ou entre amis, propose une revanche au même adversaire.
• Réactions : Pendant le match, envoie des réactions de la mascotte à ton adversaire ou sors-lui le carton rouge.
• Défi du jour : La même grille pour tout le monde, chaque jour. Plus ta réponse est rare, plus tu marques de points.
• Contre le bot : Joue sans attendre dès que tu veux t'échauffer.

MARQUE DES POINTS, MONTE DE NIVEAU
• Tu marques des points dans chaque jeu, et un niveau atteint ne baisse jamais.
• Prends ta place aux classements de la semaine et de tous les temps.
• Allonge ta série de récompenses quotidiennes et utilise des jokers pendant les matchs.
• Match classé perdu ? Récupère tes points en regardant une pub ou en payant 5 buts.

DU FOOT À LA PELLE
Plus de 70 000 footballeurs passés par la Süper Lig turque ou les cinq grands championnats européens, et plus de 500 clubs de 19 championnats. Joue en français, en anglais, en allemand, en espagnol, en italien ou en turc.

BON À SAVOIR
• L'appli est gratuite ; elle contient des pubs et des achats intégrés. Les buts, que tu dépenses en jokers et en protection de points, se gagnent aussi en jouant, avec la récompense quotidienne ou en regardant une pub.
• Les matchs en ligne, le défi du jour et le classement demandent une connexion Internet. Tu peux jouer au XOX contre le bot hors ligne.
• ChallengeGoal n'est affilié à aucun club, aucune ligue, aucune fédération ni aucun footballeur. Les écussons des clubs sont des dessins originaux ; les images des footballeurs sont des illustrations générées par IA, et non de vraies photos.

Assistance : destek@challengegoal.app
```

**App Store tam açıklaması**

```
Qui connaît le mieux le foot ? ChallengeGoal est un quiz foot avec huit jeux. Affronte des adversaires en ligne ou un ami et transforme ta culture foot en points.

PAS DE PUB IMPOSÉE
Aucune pub ne s'affiche en plein match. Tu regardes une pub uniquement si tu le veux, pour gagner des buts.

HUIT JEUX, UNE SEULE APPLI
• XOX : Trouve un footballeur qui correspond à la ligne et à la colonne, et aligne trois cases.
• Duel de cartes : Choisis 7 footballeurs qui collent au thème. Les questions sont cachées ; à chaque manche, joue une carte contre celle de ton adversaire.
• Fais ta compo : Prends un joueur du club de chaque manche et monte l'effectif le plus fort sur la stat visée.
• Plus ou moins : Deux footballeurs, un critère. Choisis le plus élevé et garde ta série.
• Chaîne de clubs : Cite un footballeur passé par le même club que le précédent. Si tu casses la chaîne, tu perds la manche.
• Enchères : Annonce combien de réponses tu peux citer, puis surenchéris. Si ton adversaire te lance « Prouve-le », tu dois les citer.
• Top 10 : À tour de rôle, retrouvez les noms de la liste. Un nom qui n'y figure pas coûte une vie.
• Parcours de carrière : Les clubs apparaissent dans l'ordre de la carrière. Celui qui trouve le footballeur avec le moins d'indices gagne.

IL Y A TOUJOURS UN MATCH À JOUER
• Matchs en ligne : Choisis un jeu et une difficulté, et lance un match en quelques secondes.
• Défier un ami : Ouvre un salon et partage le code.
• Revanche : À la fin d'un match en ligne ou entre amis, propose une revanche au même adversaire.
• Réactions : Pendant le match, envoie des réactions de la mascotte à ton adversaire ou sors-lui le carton rouge.
• Défi du jour : La même grille pour tout le monde, chaque jour. Plus ta réponse est rare, plus tu marques de points.
• Contre le bot : Joue sans attendre dès que tu veux t'échauffer.

MARQUE DES POINTS, MONTE DE NIVEAU
• Tu marques des points dans chaque jeu, et un niveau atteint ne baisse jamais.
• Prends ta place aux classements de la semaine et de tous les temps.
• Allonge ta série de récompenses quotidiennes et utilise des jokers pendant les matchs.
• Match classé perdu ? Récupère tes points en regardant une pub ou en payant 5 buts.

DU FOOT À LA PELLE
Plus de 70 000 footballeurs et plus de 500 clubs. Joue en français, en anglais, en allemand, en espagnol, en italien ou en turc.

BON À SAVOIR
• L'appli est gratuite ; elle contient des pubs et des achats intégrés. Les buts, que tu dépenses en jokers et en protection de points, se gagnent aussi en jouant, avec la récompense quotidienne ou en regardant une pub.
• Les matchs en ligne, le défi du jour et le classement demandent une connexion Internet. Tu peux jouer au XOX contre le bot hors ligne.
• ChallengeGoal n'est affilié à aucun club, aucune ligue, aucune fédération ni aucun footballeur. Les images des footballeurs sont des illustrations générées par IA, et non de vraies photos.

Assistance : destek@challengegoal.app
```

**1.1.0 sürüm notu** (iki mağazada aynı)

```
• Revanche : À la fin d'un match en ligne ou entre amis, tu peux proposer une revanche au même adversaire.
• Réactions : Pendant le match, envoie des réactions de la mascotte à ton adversaire.
• Les jokers s'affichent aussi dans la recherche de footballeurs, et un grand bouton +15 secondes apparaît quand le temps presse.
• Tu peux maintenant aussi récupérer les points d'un match perdu avec 5 buts.
• La Chaîne de clubs compte désormais les clubs de 13 championnats de plus.
```

## İtalyanca (it-IT, it)

**Google Play adı**

```
ChallengeGoal: Quiz di Calcio
```

**Google Play kısa açıklaması**

```
8 giochi a quiz sul calcio senza pubblicità obbligatoria. Fai punti e sali.
```

**App Store adı**

```
ChallengeGoal: Quiz di Calcio
```

**App Store alt başlığı**

```
Sfida del giorno e duelli
```

**App Store anahtar kelimeleri**

```
trivia,xox,tris,calciatori,calciatore,formazione,carriera,duello,online,partita,indovina,domande
```

**App Store tanıtım metni**

```
8 giochi a quiz sul calcio senza pubblicità obbligatoria. Trova un avversario, chiedi la rivincita, fai punti.
```

**Google Play tam açıklaması**

```
Chi ne sa di più di calcio? ChallengeGoal è un quiz di calcio con otto giochi. Sfida avversari online o un amico e trasforma quello che sai in punti.

NESSUNA PUBBLICITÀ OBBLIGATORIA
Nessuna pubblicità compare a metà partita. Guardi un annuncio solo se vuoi, per guadagnare gol.

OTTO GIOCHI, UNA SOLA APP
• XOX: Trova un calciatore che va bene sia per la riga sia per la colonna e metti in fila tre caselle.
• Duello di Carte: Scegli 7 calciatori in tema. Le domande sono nascoste: a ogni round giochi una carta contro quella dell'avversario.
• Fai la Formazione: A ogni round prendi un calciatore dal club di turno e costruisci la formazione più forte nella statistica obiettivo.
• Chi di Più: Due calciatori, un criterio. Scegli chi ha il valore più alto e allunga la serie.
• Catena di Club: Scrivi un calciatore che ha giocato nello stesso club del precedente. Chi spezza la catena perde il round.
• Asta delle Risposte: Dichiara quante risposte sai dare e rilancia. Se l'avversario dice "Dimostralo", devi elencarle tutte.
• Top 10: A turno, trovate i nomi della lista. Un nome che non c'è costa una vita.
• Carriera Misteriosa: I club compaiono in ordine di carriera. Vince chi indovina il calciatore con meno indizi.

C'È SEMPRE UNA PARTITA PRONTA
• Partite online: Scegli gioco e difficoltà e in pochi secondi sei in campo.
• Gioca con un amico: Apri una stanza e condividi il codice.
• Rivincita: Quando finisce una partita online o con un amico, offri la rivincita allo stesso avversario.
• Reazioni: Durante la partita manda all'avversario le reazioni della mascotte o tira fuori il cartellino rosso.
• Sfida del giorno: Ogni giorno la stessa griglia per tutti. Più la tua risposta è rara, più punti fai.
• Contro il bot: Gioca senza aspettare quando vuoi scaldarti.

FAI PUNTI, SALI DI LIVELLO
• Fai punti in ogni gioco, e un livello raggiunto non si perde più.
• Conquista il tuo posto nelle classifiche settimanale e di sempre.
• Allunga la serie del premio giornaliero e usa i jolly in partita.
• Hai perso una partita valida per la classifica? Recupera i punti guardando una pubblicità o pagando 5 gol.

TANTISSIMO CALCIO
Più di 70.000 calciatori che hanno giocato nella Süper Lig turca o nei cinque grandi campionati europei, e più di 500 club di 19 campionati. Si gioca in italiano, inglese, tedesco, spagnolo, francese e turco.

BUONO A SAPERSI
• L'app è gratuita; contiene pubblicità e acquisti in-app. I gol, che spendi per i jolly e per proteggere i punti, si guadagnano anche giocando, con il premio giornaliero o guardando una pubblicità.
• Le partite online, la sfida del giorno e la classifica richiedono una connessione a Internet. A XOX contro il bot puoi giocare anche offline.
• ChallengeGoal non è affiliato ad alcun club, lega, federazione o calciatore. Gli stemmi dei club sono disegni originali; le immagini dei calciatori sono illustrazioni generate con l'IA, non fotografie reali.

Assistenza: destek@challengegoal.app
```

**App Store tam açıklaması**

```
Chi ne sa di più di calcio? ChallengeGoal è un quiz di calcio con otto giochi. Sfida avversari online o un amico e trasforma quello che sai in punti.

NESSUNA PUBBLICITÀ OBBLIGATORIA
Nessuna pubblicità compare a metà partita. Guardi un annuncio solo se vuoi, per guadagnare gol.

OTTO GIOCHI, UNA SOLA APP
• XOX: Trova un calciatore che va bene sia per la riga sia per la colonna e metti in fila tre caselle.
• Duello di Carte: Scegli 7 calciatori in tema. Le domande sono nascoste: a ogni round giochi una carta contro quella dell'avversario.
• Fai la Formazione: A ogni round prendi un calciatore dal club di turno e costruisci la formazione più forte nella statistica obiettivo.
• Chi di Più: Due calciatori, un criterio. Scegli chi ha il valore più alto e allunga la serie.
• Catena di Club: Scrivi un calciatore che ha giocato nello stesso club del precedente. Chi spezza la catena perde il round.
• Asta delle Risposte: Dichiara quante risposte sai dare e rilancia. Se l'avversario dice "Dimostralo", devi elencarle tutte.
• Top 10: A turno, trovate i nomi della lista. Un nome che non c'è costa una vita.
• Carriera Misteriosa: I club compaiono in ordine di carriera. Vince chi indovina il calciatore con meno indizi.

C'È SEMPRE UNA PARTITA PRONTA
• Partite online: Scegli gioco e difficoltà e in pochi secondi sei in campo.
• Gioca con un amico: Apri una stanza e condividi il codice.
• Rivincita: Quando finisce una partita online o con un amico, offri la rivincita allo stesso avversario.
• Reazioni: Durante la partita manda all'avversario le reazioni della mascotte o tira fuori il cartellino rosso.
• Sfida del giorno: Ogni giorno la stessa griglia per tutti. Più la tua risposta è rara, più punti fai.
• Contro il bot: Gioca senza aspettare quando vuoi scaldarti.

FAI PUNTI, SALI DI LIVELLO
• Fai punti in ogni gioco, e un livello raggiunto non si perde più.
• Conquista il tuo posto nelle classifiche settimanale e di sempre.
• Allunga la serie del premio giornaliero e usa i jolly in partita.
• Hai perso una partita valida per la classifica? Recupera i punti guardando una pubblicità o pagando 5 gol.

TANTISSIMO CALCIO
Più di 70.000 calciatori e più di 500 club. Si gioca in italiano, inglese, tedesco, spagnolo, francese e turco.

BUONO A SAPERSI
• L'app è gratuita; contiene pubblicità e acquisti in-app. I gol, che spendi per i jolly e per proteggere i punti, si guadagnano anche giocando, con il premio giornaliero o guardando una pubblicità.
• Le partite online, la sfida del giorno e la classifica richiedono una connessione a Internet. A XOX contro il bot puoi giocare anche offline.
• ChallengeGoal non è affiliato ad alcun club, lega, federazione o calciatore. Le immagini dei calciatori sono illustrazioni generate con l'IA, non fotografie reali.

Assistenza: destek@challengegoal.app
```

**1.1.0 sürüm notu** (iki mağazada aynı)

```
• Rivincita: Quando finisce una partita online o con un amico, puoi offrire la rivincita allo stesso avversario.
• Reazioni: Durante la partita manda all'avversario le reazioni della mascotte.
• I jolly compaiono anche nella ricerca dei calciatori, e quando il tempo sta per finire appare un grande pulsante +15 secondi.
• Ora puoi recuperare i punti di una partita persa anche con 5 gol.
• Nella Catena di Club contano anche i club di 13 campionati in più.
```

## App Store inceleme notu (İngilizce)

### 1.1.0

Sürüm sayfasındaki App Review Information → Notes alanında duran metin (31 Ekim 2026). Yalnızca bu sürümde değişenleri anlatır; uygulamanın tamamını anlatan ilk başvuru notu aşağıda.

```
Hello, and thank you for reviewing this update.

ChallengeGoal is a football (soccer) trivia game. A demo member account is in the Sign-In Information fields. You can also tap "Continue as guest" on the first screen.

What is new in 1.1.0:
- Rematch: when an online match or a friend room match ends, either player can offer the same opponent a rematch for 30 seconds.
- Reactions: during an online match, the button in the middle of the match header opens 12 preset illustrated reactions (our mascot and football moments such as a red card). There is no free text and no user-generated content. Reactions can be muted from the same panel.
- Jokers are now also shown above the footballer search field, and a larger "+15 s" extra time button appears in the last seconds of a turn.
- Point protection: after a lost ranked match, the result screen offers to restore the lost points by watching an optional rewarded ad or by paying 5 goals (the in-game currency).
- Club Chain also accepts links through clubs of 13 more leagues.

As described in our earlier notes, if nobody is waiting for a match, a computer-controlled opponent joins after a short wait. It can also accept or offer a rematch and send reactions.

Nothing changed in accounts, purchases, ads or data collection. The App Tracking Transparency request is still shown on first launch, before the ads SDK starts or any ad is requested. The four goal packs (goals_cg_30, goals_cg_100, goals_cg_250, goals_cg_600) are consumable. Goals are also earned for free by playing, with the daily reward and with optional rewarded ads. Nothing is locked behind payment.

The app is not affiliated with any club, league, federation or footballer and uses no official logos. Club crests are our own original drawings. On first launch the app may show "Updating data" for a few seconds while it downloads the current football database (about 21 MB).
```

### İlk başvuru (1.0.0)

Apple 10 Ekim 2026'da ilk başvuruya "Guideline 2.1 - Information Needed" ile yedi maddelik bilgi ve bir ekran kaydı istedi. Aşağıdaki metin hem cevap olarak gönderilir hem de sürüm sayfasındaki App Review Information → Notes alanına yazılır (sınır 4.000 karakter). Uygulamada bu maddelerden birini değiştiren bir şey olursa (yeni servis, yeni satın alma, yeni oyun) metin de güncellenmeli.

```
Hello, and thank you for the review. The requested information is below.

1. SCREEN RECORDING
Attached to this reply. Recorded on an iPhone running iOS [VERSION]. It shows launch, account creation, a match, the daily puzzle, the Goal Store with an In-App Purchase, sign-out and sign-in, the report option and account deletion.

2. PURPOSE AND AUDIENCE
ChallengeGoal is a football (soccer) trivia game for fans aged 13 and over. It offers eight short quiz games built on real career data, for example XOX: name a footballer who played for both the club in the row and the country in the column. Players test their knowledge against other players, a friend or the bot, earn points, level up and appear on a leaderboard. There is also one daily puzzle.

3. HOW TO ACCESS THE MAIN FEATURES
- No account is needed: tap "Continue as guest" on the first screen. A demo member account (review@challengegoal.app) is in the Sign-In Information fields.
- Home screen: pick a game and a difficulty, then "Online match", "Versus bot" or "Play a friend" (a private room with a code).
- Online match pairs you with another player. If nobody is waiting, a computer-controlled opponent joins after a short wait, so a match always starts.
- "Daily puzzle" and "Leaderboard" are on the home screen. The account screen (top right) has sign-out, the notification switch, "Report a problem or a player", the privacy policy, the terms and "Delete account".
- The App Tracking Transparency prompt appears on first launch, over the first screen, before the ads SDK is started or any ad is requested. A recording is attached.
- On first launch the app may show "Updating data" for a few seconds while it downloads the current football database (about 21 MB) from our server.

4. EXTERNAL SERVICES
- Our own server (hosted by Contabo in Germany): accounts, matchmaking, scores.
- Sign in with Apple and Google Sign-In for authentication; email and password is also available.
- Apple In-App Purchase; purchases are verified with the App Store Server API.
- Google AdMob: optional rewarded ads only, no banners or interstitials.
- Expo push service and APNs for notifications.
- Resend for the password reset email.
- Football data comes from Wikidata and is bundled in the app. The app calls no AI service. Footballer portraits were prepared in advance as AI-redrawn illustrations of freely licensed Wikimedia Commons photos.

5. REGIONAL DIFFERENCES
The app works the same in every region. It is available in Turkish, English, German, Spanish, French and Italian. Players who use it in Turkish get questions, a daily puzzle and matchmaking centred on the Turkish league; all other languages share one international set. The leaderboard is global.

6. THIRD-PARTY MATERIAL
The app is not affiliated with or endorsed by any club, league, federation or footballer, and its terms say so. It uses no official logos, kits or league branding; club crests are our own original drawings. Footballer and club names and career facts are factual data from Wikidata, published under CC0. Portraits are illustrations derived from Wikimedia Commons photos under CC0, public domain, CC BY or CC BY-SA licences; the source, author and licence of each one is listed in the app under Account > Image sources.

7. IN-APP PURCHASES
Four consumable packs of "goals", the in-game currency: 30, 100, 250 and 600 goals (goals_cg_30, goals_cg_100, goals_cg_250, goals_cg_600). Goals are spent on jokers during a match (hint, extra time and similar, 3 goals each) and, after a lost ranked match, on getting the lost points back (5 goals). Goals are also earned for free: 15 welcome goals, a daily reward, winning matches, the daily puzzle and optional rewarded ads. Nothing is locked behind payment.
To reach the purchase flow: sign in with the demo account (guests cannot buy), tap the goal balance at the top of the home screen to open the Goal Store and choose a pack.
```

## Görseller

| Görsel | Dosya | Not |
|---|---|---|
| Google Play simgesi (512×512) | `data/build/store/play-icon-512.png` | `data/branding/store_assets.py` üretir |
| Google Play tanıtım görseli (1024×500) | `data/build/store/play-feature-1024x500.png` | Aynı betik |
| Gol paketi simgeleri | `data/build/store/goals_cg_*.png` | 9 Ekim'de yeni topla yeniden üretildi; Play ürünlerine yeniden yüklenmeli |
| Ekran görüntüleri | `data/build/store/submission/{google-play,app-store}/screenshots-<dil>/` | Google Play: ana ekran, günün bulmacası, Kart Düellosu, Açık Artırma, Zincir. App Store (16 Ekim 2026'dan beri): ana ekran, Hangisi Yüksek, Kart Düellosu, sekiz oyun, arkadaş odası; kulüp adı ve arma görünmez. Türkçe dışındaki bütün dillerin sayfası (App Store'da İngilizce U.K. ve U.S. dahil altı kayıt, Google Play'de beş dil) İngilizce görselleri ve İngilizce tanıtım görselini kullanır (31 Ekim 2026) |
