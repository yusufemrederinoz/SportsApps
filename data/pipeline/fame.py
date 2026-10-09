import math

LOCAL_WEIGHT = 0.65


def clip(value):
    return max(0.0, min(1.0, value))


def local_share(local_views):
    return clip((math.log10(local_views + 1) - 2.3) / 2.2)


def score(local_views, sitelinks, market_value, caps):
    return blend(local_share(local_views), sitelinks, market_value, caps)


def exact(local, sitelinks, market_value, caps):
    reach = clip(math.log1p(sitelinks) / math.log1p(150))
    value = clip((math.log10(market_value) - 6.0) / 2.3) if market_value else 0.0
    national = clip(caps / 100) if caps else 0.0
    worldwide = max(reach, value, 0.8 * national)
    return 100 * (LOCAL_WEIGHT * local + (1 - LOCAL_WEIGHT) * worldwide)


def blend(local, sitelinks, market_value, caps):
    return round(exact(local, sitelinks, market_value, caps))


def shared_share(views_by_language, reference_views):
    reference = sorted((views for views in reference_views if views > 0), reverse=True)
    shares = {}
    for views in views_by_language:
        ranked = sorted(((count, player_id) for player_id, count in views.items() if count > 0), reverse=True)
        for rank, (_, player_id) in enumerate(ranked):
            equivalent = reference[rank] if rank < len(reference) else 0
            shares[player_id] = shares.get(player_id, 0.0) + local_share(equivalent) / len(views_by_language)
    return shares


def matched(raw_scores, reference_scores):
    order = sorted(raw_scores, key=lambda player_id: (-raw_scores[player_id], player_id))
    targets = sorted(reference_scores, reverse=True)
    return {player_id: targets[rank] if rank < len(targets) else 0 for rank, player_id in enumerate(order)}
