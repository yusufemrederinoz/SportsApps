import csv

from .config import PLAYER_REGISTRY_PATH, REASSIGNED_ID_OFFSET, TRANSFERMARKT_ONLY_ID_OFFSET
from .wikidata import entity_number

FIELDS = ("id", "transfermarkt_id", "wikidata_id")
TRANSFERMARKT = 0
WIKIDATA = 1


def natural_id(transfermarkt_id, wikidata_id):
    return entity_number(wikidata_id) if wikidata_id else TRANSFERMARKT_ONLY_ID_OFFSET + transfermarkt_id


class PlayerRegistry:
    def __init__(self, rows=()):
        self.sources = {player_id: (transfermarkt_id, wikidata_id) for player_id, transfermarkt_id, wikidata_id in rows}

    @classmethod
    def load(cls, path=PLAYER_REGISTRY_PATH):
        if not path.exists():
            return cls()
        with open(path, encoding="utf-8", newline="") as source:
            return cls(
                (int(row["id"]), int(row["transfermarkt_id"]) if row["transfermarkt_id"] else None, row["wikidata_id"] or None)
                for row in csv.DictReader(source)
            )

    def save(self, path=PLAYER_REGISTRY_PATH):
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8", newline="") as target:
            writer = csv.writer(target, lineterminator="\n")
            writer.writerow(FIELDS)
            for player_id in sorted(self.sources):
                transfermarkt_id, wikidata_id = self.sources[player_id]
                writer.writerow((player_id, transfermarkt_id or "", wikidata_id or ""))

    def owners(self, position):
        return {sources[position]: player_id for player_id, sources in self.sources.items() if sources[position]}

    def spare_id(self):
        return max((player_id for player_id in self.sources if player_id > REASSIGNED_ID_OFFSET), default=REASSIGNED_ID_OFFSET) + 1

    def assign(self, entities):
        assigned = [None] * len(entities)
        claimed = set()
        for position in (WIKIDATA, TRANSFERMARKT):
            owners = self.owners(position)
            for index, entity in enumerate(entities):
                known = owners.get(entity[position])
                if assigned[index] is None and known is not None and known not in claimed:
                    assigned[index] = known
                    claimed.add(known)
        for index, (transfermarkt_id, wikidata_id) in enumerate(entities):
            if assigned[index] is None:
                player_id = natural_id(transfermarkt_id, wikidata_id)
                if player_id in self.sources:
                    player_id = self.spare_id()
                self.sources[player_id] = (None, None)
                assigned[index] = player_id
                claimed.add(player_id)

        taken = [{entity[position] for entity in entities} for position in (TRANSFERMARKT, WIKIDATA)]
        for player_id, sources in self.sources.items():
            if player_id not in claimed:
                self.sources[player_id] = tuple(
                    None if source in taken[position] else source for position, source in enumerate(sources)
                )
        for player_id, entity in zip(assigned, entities):
            self.sources[player_id] = tuple(entity)
        return assigned
