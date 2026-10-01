"""今あるキャンペーンを plan.py に合わせる。違うところだけを 1 回の mutate で直す（全部通るか、何も変わらないか）

create_campaign.py はキャンペーンを新しく作るとき用。作ったあとの見直しはこちらを使う [ADS.md §9]。
キャンペーンの状態・予算・入札・地域・除外キーワードは変えない。

python3 tracking/ads/sync_campaign.py          # 変更の一覧と検証だけ（何も変えない）
python3 tracking/ads/sync_campaign.py --apply  # 反映
"""
import sys

import plan
from api import AdsApiError, Client

MICROS = 1_000_000


# --- 比べるための鍵 -------------------------------------------------------

def sitelink_key(link):
    return (link["text"], link["d1"], link["d2"], link["url"])


def snippet_key():
    return (plan.STRUCTURED_SNIPPET["header"], tuple(plan.STRUCTURED_SNIPPET["values"]))


def price_key():
    return tuple((p["header"], p["description"], p["amount_yen"], p.get("unit", "")) for p in plan.PRICE_OFFERINGS)


# --- 広告アカウントを読む -------------------------------------------------

def fetch_live(client):
    where = f"campaign.name = '{plan.CAMPAIGN_NAME}'"
    campaigns = client.search(f"SELECT campaign.name, campaign.resource_name FROM campaign WHERE {where} AND campaign.status != 'REMOVED'")
    if not campaigns:
        raise AdsApiError(f"キャンペーンがありません：{plan.CAMPAIGN_NAME}（新しく作るときは create_campaign.py）")
    live = {"campaign": campaigns[0]["campaign"]["resourceName"], "groups": {}, "keywords": {}, "ads": {}, "assets": []}

    for r in client.search(f"SELECT campaign.name, ad_group.resource_name, ad_group.name, ad_group.status FROM ad_group "
                           f"WHERE {where} AND ad_group.status != 'REMOVED'"):
        g = r["adGroup"]
        live["groups"][g["name"]] = {"rn": g["resourceName"], "status": g["status"]}

    for r in client.search(f"SELECT campaign.name, ad_group.name, ad_group_criterion.resource_name, ad_group_criterion.keyword.text, "
                           f"ad_group_criterion.keyword.match_type FROM ad_group_criterion WHERE {where} "
                           "AND ad_group_criterion.type = 'KEYWORD' AND ad_group_criterion.negative = FALSE "
                           "AND ad_group_criterion.status != 'REMOVED'"):
        kw = r["adGroupCriterion"]["keyword"]
        live["keywords"].setdefault(r["adGroup"]["name"], {})[(kw["text"], kw["matchType"])] = r["adGroupCriterion"]["resourceName"]

    for r in client.search(f"SELECT campaign.name, ad_group.name, ad_group_ad.resource_name, ad_group_ad.ad.final_urls, "
                           f"ad_group_ad.ad.responsive_search_ad.headlines, ad_group_ad.ad.responsive_search_ad.descriptions "
                           f"FROM ad_group_ad WHERE {where} AND ad_group_ad.status != 'REMOVED'"):
        ad = r["adGroupAd"]["ad"]
        rsa = ad.get("responsiveSearchAd", {})
        live["ads"].setdefault(r["adGroup"]["name"], []).append({
            "rn": r["adGroupAd"]["resourceName"], "final_urls": ad.get("finalUrls", []),
            "headlines": [h["text"] for h in rsa.get("headlines", [])],
            "descriptions": [d["text"] for d in rsa.get("descriptions", [])]})

    for r in client.search(f"SELECT campaign.name, campaign_asset.resource_name, campaign_asset.field_type, asset.final_urls, "
                           "asset.sitelink_asset.link_text, asset.sitelink_asset.description1, asset.sitelink_asset.description2, "
                           "asset.callout_asset.callout_text, asset.structured_snippet_asset.header, asset.structured_snippet_asset.values, "
                           f"asset.price_asset.price_offerings FROM campaign_asset WHERE {where} AND campaign_asset.status != 'REMOVED'"):
        live["assets"].append({"rn": r["campaignAsset"]["resourceName"], "type": r["campaignAsset"]["fieldType"],
                               "key": _live_asset_key(r["campaignAsset"]["fieldType"], r["asset"])})
    return live


def _live_asset_key(field_type, asset):
    if field_type == "SITELINK":
        s = asset.get("sitelinkAsset", {})
        return (s.get("linkText"), s.get("description1"), s.get("description2"), (asset.get("finalUrls") or [""])[0])
    if field_type == "CALLOUT":
        return asset.get("calloutAsset", {}).get("calloutText")
    if field_type == "STRUCTURED_SNIPPET":
        s = asset.get("structuredSnippetAsset", {})
        return (s.get("header"), tuple(s.get("values", [])))
    if field_type == "PRICE":
        return tuple((o.get("header"), o.get("description"), int(o.get("price", {}).get("amountMicros", 0)) // MICROS,
                      "" if o.get("unit") in (None, "UNSPECIFIED", "NONE") else o["unit"])
                     for o in asset.get("priceAsset", {}).get("priceOfferings", []))
    return None


# --- 操作を組み立てる（副作用なし） ---------------------------------------

def _ad_create(ad_group, group):
    return {"adGroupAdOperation": {"create": {"adGroup": ad_group, "status": "ENABLED", "ad": {
        "finalUrls": [plan.FINAL_URL], "responsiveSearchAd": {
            "headlines": [{"text": h} for h in plan.headlines_for(group)],
            "descriptions": [{"text": d} for d in plan.descriptions_for(group)]}}}}}


def _keyword_create(ad_group, text, match):
    return {"adGroupCriterionOperation": {"create": {"adGroup": ad_group, "status": "ENABLED",
                                                     "keyword": {"text": text, "matchType": match}}}}


def _group_operations(resource, live, group, index):
    ops, notes = [], []
    name = group["name"]
    planned = [plan.parse_keyword(k) for k in group["keywords"]]
    if name not in live["groups"]:
        ad_group = resource("adGroups", -10 - index)
        ops.append({"adGroupOperation": {"create": {"resourceName": ad_group, "name": name, "campaign": live["campaign"],
                                                    "status": group["status"], "type": "SEARCH_STANDARD"}}})
        ops += [_keyword_create(ad_group, t, m) for t, m in planned] + [_ad_create(ad_group, group)]
        notes.append(f"広告グループを作る：{name}（{'配信' if group['status'] == 'ENABLED' else '停止'}・キーワード {len(planned)} 語・広告 1 本）")
        return ops, notes

    current = live["groups"][name]
    if current["status"] != group["status"]:
        ops.append({"adGroupOperation": {"update": {"resourceName": current["rn"], "status": group["status"]}, "updateMask": "status"}})
        notes.append(f"{name}：{current['status']} → {group['status']}")

    have = live["keywords"].get(name, {})
    added = [(t, m) for t, m in planned if (t, m) not in have]
    removed = [key for key in have if key not in planned]
    ops += [_keyword_create(current["rn"], t, m) for t, m in added]
    ops += [{"adGroupCriterionOperation": {"remove": have[key]}} for key in removed]
    if added:
        notes.append(f"{name}：キーワードを追加 " + "、".join(t for t, _ in added))
    if removed:
        notes.append(f"{name}：キーワードを削除 " + "、".join(t for t, _ in removed))

    ads = live["ads"].get(name, [])
    same = (len(ads) == 1 and ads[0]["headlines"] == plan.headlines_for(group)
            and ads[0]["descriptions"] == plan.descriptions_for(group) and ads[0]["final_urls"] == [plan.FINAL_URL])
    if not same:
        ops += [{"adGroupAdOperation": {"remove": ad["rn"]}} for ad in ads] + [_ad_create(current["rn"], group)]
        notes.append(f"{name}：広告を作り直す（見出し {len(plan.headlines_for(group))} 本・説明文 {len(plan.descriptions_for(group))} 本）")
    return ops, notes


def _asset_create_ops(resource, campaign, temp_id, field_type, asset_body):
    asset = resource("assets", temp_id)
    return [{"assetOperation": {"create": dict(asset_body, resourceName=asset)}},
            {"campaignAssetOperation": {"create": {"campaign": campaign, "asset": asset, "fieldType": field_type}}}]


def _planned_assets():
    """(種類, 鍵, 表示名, asset の中身)"""
    items = [("SITELINK", sitelink_key(s), f"サイトリンク「{s['text']}」",
              {"finalUrls": [s["url"]], "sitelinkAsset": {"linkText": s["text"], "description1": s["d1"], "description2": s["d2"]}})
             for s in plan.SITELINKS]
    items += [("CALLOUT", c, f"コールアウト「{c}」", {"calloutAsset": {"calloutText": c}}) for c in plan.CALLOUTS]
    items.append(("STRUCTURED_SNIPPET", snippet_key(), "構造化スニペット",
                  {"structuredSnippetAsset": {"header": plan.STRUCTURED_SNIPPET["header"], "values": plan.STRUCTURED_SNIPPET["values"]}}))
    offerings = [dict({"header": p["header"], "description": p["description"], "finalUrl": p["url"],
                       "price": {"amountMicros": str(p["amount_yen"] * MICROS), "currencyCode": "JPY"}},
                      **({"unit": p["unit"]} if p.get("unit") else {})) for p in plan.PRICE_OFFERINGS]
    items.append(("PRICE", price_key(), "価格",
                  {"priceAsset": {"type": "SERVICES", "priceQualifier": "FROM", "languageCode": "ja", "priceOfferings": offerings}}))
    return items


def _asset_operations(resource, live):
    ops, notes = [], []
    planned = _planned_assets()
    wanted = {(t, k) for t, k, _, _ in planned}
    for a in live["assets"]:
        if (a["type"], a["key"]) not in wanted:
            ops.append({"campaignAssetOperation": {"remove": a["rn"]}})
            notes.append(f"外す：{a['type']} {a['key']}")
    have = {(a["type"], a["key"]) for a in live["assets"]}
    for i, (field_type, key, label, body) in enumerate(planned):
        if (field_type, key) not in have:
            ops += _asset_create_ops(resource, live["campaign"], -100 - i, field_type, body)
            notes.append(f"付ける：{label}")
    return ops, notes


def build_operations(resource, live):
    ops, notes = [], []
    for i, group in enumerate(plan.AD_GROUPS):
        group_ops, group_notes = _group_operations(resource, live, group, i)
        ops += group_ops
        notes += group_notes
    extra = sorted(set(live["groups"]) - {g["name"] for g in plan.AD_GROUPS})
    notes += [f"plan.py にない広告グループはそのまま：{name}" for name in extra]
    asset_ops, asset_notes = _asset_operations(resource, live)
    return ops + asset_ops, notes + asset_notes


def main(apply):
    client = Client()
    ops, notes = build_operations(client.resource, fetch_live(client))
    print("\n".join(f"- {n}" for n in notes) or "- 変更なし")
    if not ops:
        return
    client.mutate(ops, validate_only=not apply)
    print(f"\n{'反映しました' if apply else '検証に通りました（何も変えていません）'}：{len(ops)} 件の操作。キャンペーンの状態は変えていません")
    if not apply:
        print("反映するときは --apply")


if __name__ == "__main__":
    try:
        main(apply="--apply" in sys.argv[1:])
    except AdsApiError as e:
        print(f"失敗しました：{e}", file=sys.stderr)
        sys.exit(1)
