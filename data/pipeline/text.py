import unicodedata

_FOLDS = str.maketrans(
    {
        "ı": "i",
        "İ": "i",
        "ø": "o",
        "Ø": "o",
        "đ": "d",
        "Đ": "d",
        "ð": "d",
        "ł": "l",
        "Ł": "l",
        "ß": "ss",
        "æ": "ae",
        "Æ": "ae",
        "œ": "oe",
        "Œ": "oe",
        "þ": "th",
    }
)


def normalize(value):
    decomposed = unicodedata.normalize("NFKD", value.translate(_FOLDS).lower())
    unmarked = (char for char in decomposed if not unicodedata.category(char).startswith("M"))
    kept = "".join(char if char.isalnum() else " " for char in unmarked)
    return " ".join(kept.split())
