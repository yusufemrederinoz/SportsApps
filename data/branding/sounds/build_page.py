import json
import sys
from pathlib import Path

ROLES = [
    {"id": "whistle", "name": "Düdük", "current": "whistle", "where": "Maçın başında ve sonunda, rövanş teklifinde; kırmızı kart, VAR ve ofsayt tepkilerinde."},
    {"id": "win", "name": "Kazanma", "current": "win", "where": "Maçı kazanınca ve günün bulmacası bitince."},
    {"id": "reward", "name": "Ödül", "tag": "Yeni", "current": "win", "where": "Günlük ödül, gol satın alma ve ödüllü reklamdan sonra. Bugün bunlarda da kazanma sesi çalıyor; buradan seçersen ayrılır."},
    {"id": "correct", "name": "Doğru", "current": "correct", "where": "Doğru cevapta, puan korumada ve alkış tepkisinde."},
    {"id": "wrong", "name": "Yanlış", "current": "wrong", "where": "Yanlış cevapta ve kızgın tepkide."},
    {"id": "impact", "name": "Hamle", "current": "impact", "where": "Kart oynarken, futbolcu seçerken ve şaşkın tepkide."},
    {"id": "tick", "name": "Süre", "current": "tick", "where": "Sürenin son saniyelerinde her saniye ve terleyen tepkide."},
    {"id": "whoosh", "name": "Geçiş", "current": "whoosh", "where": "Yeni tur başlarken ve havalı tepkide."},
    {"id": "ambience", "name": "Tribün uğultusu", "tag": "Yeni", "loop": True, "where": "Maç boyunca arkada alçak sesle çalar, ayarlardan kapatılabilir. 40 saniyelik döngü olarak çalıyor; başa sardığı yerde atlama duyuluyor mu, ona da kulak ver."},
    {"id": "boing", "name": "Gülme tepkisi", "current": "boing", "where": "Rakibe gülme tepkisi gönderilince."},
    {"id": "pop", "name": "Takılma tepkisi", "current": "pop", "where": "Rakibe takılma tepkisi gönderilince."},
    {"id": "sad", "name": "Ağlama tepkisi", "current": "sad", "where": "Rakibe ağlama tepkisi gönderilince."},
]

ROUND_TWO = {
    "win": "Kısa ve yormayan sesler: 1–2 saniye.",
    "reward": "Ödülü toplama sesleri: jeton, parıltı, ganimet.",
    "wrong": "Şimdikine yakın, kısa ve tok sesler; ilk ikisi şimdiki sesin temiz yeniden yapımı.",
    "impact": "Bu sesi ilk turda seçmedin. İlk turun adayları (A–E) ve yeni kart sesleri (F–I) birlikte.",
}
REPLACED = {"win", "reward", "wrong"}

if __name__ == "__main__":
    tools, audition = Path(sys.argv[1]), Path(sys.argv[2])
    first = json.loads((audition / "audio" / "candidates.json").read_text(encoding="utf-8"))
    second = json.loads((audition / "audio" / "candidates-round2.json").read_text(encoding="utf-8"))
    candidates = [item for item in first if item["role"] not in REPLACED] + second
    pending = [role for role in ROLES if role["id"] in ROUND_TWO]
    for role in pending:
        role["tag"] = "2. tur"
        role["where"] = f"{role['where']} {ROUND_TWO[role['id']]}"
    ROLES[:] = pending + [role for role in ROLES if role["id"] not in ROUND_TWO]
    fields = ("role", "name", "title", "author", "source", "page", "duration")
    data = {"roles": ROLES, "candidates": [{key: item[key] for key in fields} for item in candidates]}
    payload = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    page = (tools / "template.html").read_text(encoding="utf-8").replace("__DATA__", payload)
    (audition / "ses-secimi.html").write_text(page, encoding="utf-8")
    files = {f"audio/{path.name}": str(path) for path in sorted((audition / "audio").glob("*.mp3"))}
    (audition / "files.json").write_text(json.dumps(files, indent=1), encoding="utf-8")
    missing = [role["current"] for role in ROLES if role.get("current") and f"audio/current-{role['current']}.mp3" not in files]
    print(len(files), "audio files; missing current:", missing)
