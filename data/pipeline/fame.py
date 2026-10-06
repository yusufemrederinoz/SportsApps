import math

LOCAL_WEIGHT = 0.65


def clip(value):
    return max(0.0, min(1.0, value))


def score(local_views, sitelinks, market_value, caps):
    local = clip((math.log10(local_views + 1) - 2.3) / 2.2)
    reach = clip(math.log1p(sitelinks) / math.log1p(150))
    value = clip((math.log10(market_value) - 6.0) / 2.3) if market_value else 0.0
    national = clip(caps / 100) if caps else 0.0
    worldwide = max(reach, value, 0.8 * national)
    return round(100 * (LOCAL_WEIGHT * local + (1 - LOCAL_WEIGHT) * worldwide))
