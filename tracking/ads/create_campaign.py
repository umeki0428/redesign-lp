"""検索キャンペーンを停止状態で作る（docs/ADS.md）。1 回の mutate にまとめ、全部作れるか何も作らないか

python3 tracking/ads/create_campaign.py          # 検証だけ（何も作らない）
python3 tracking/ads/create_campaign.py --apply  # 作成（キャンペーンは停止）
"""
import sys

import plan
from api import AdsApiError, Client

MICROS = 1_000_000


def build_operations(c):
    budget = c.resource("campaignBudgets", -1)
    campaign = c.resource("campaigns", -2)
    ops = [
        {"campaignBudgetOperation": {"create": {
            "resourceName": budget, "name": f"{plan.CAMPAIGN_NAME}_予算",
            "amountMicros": str(plan.DAILY_BUDGET_YEN * MICROS), "deliveryMethod": "STANDARD", "explicitlyShared": False}}},
        {"campaignOperation": {"create": {
            "resourceName": campaign, "name": plan.CAMPAIGN_NAME, "status": "PAUSED",
            "advertisingChannelType": "SEARCH", "campaignBudget": budget,
            "targetSpend": {"cpcBidCeilingMicros": str(plan.CPC_CEILING_YEN * MICROS)},
            "networkSettings": {"targetGoogleSearch": True, "targetSearchNetwork": False,
                                "targetContentNetwork": False, "targetPartnerSearchNetwork": False},
            "containsEuPoliticalAdvertising": "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING"}}},
        {"campaignCriterionOperation": {"create": {"campaign": campaign, "location": {"geoTargetConstant": plan.GEO_JAPAN}}}},
        {"campaignCriterionOperation": {"create": {"campaign": campaign, "language": {"languageConstant": plan.LANG_JAPANESE}}}},
    ]
    ops += [{"campaignCriterionOperation": {"create": {
        "campaign": campaign, "negative": True,
        "keyword": {"text": kw, "matchType": "PHRASE" if " " in kw else "BROAD"}}}} for kw in plan.NEGATIVE_KEYWORDS]

    for i, group in enumerate(plan.AD_GROUPS):
        ad_group = c.resource("adGroups", -10 - i)
        ops.append({"adGroupOperation": {"create": {
            "resourceName": ad_group, "name": group["name"], "campaign": campaign,
            "status": group["status"], "type": "SEARCH_STANDARD"}}})
        ops += [{"adGroupCriterionOperation": {"create": {
            "adGroup": ad_group, "status": "ENABLED", "keyword": {"text": text, "matchType": match}}}}
            for text, match in map(plan.parse_keyword, group["keywords"])]
        ops.append({"adGroupAdOperation": {"create": {
            "adGroup": ad_group, "status": "ENABLED",
            "ad": {"finalUrls": [plan.FINAL_URL], "responsiveSearchAd": {
                "headlines": [{"text": h} for h in plan.headlines_for(group)],
                "descriptions": [{"text": d} for d in plan.descriptions_for(group)]}}}}})

    for i, link in enumerate(plan.SITELINKS):
        asset = c.resource("assets", -100 - i)
        ops.append({"assetOperation": {"create": {"resourceName": asset, "finalUrls": [link["url"]],
            "sitelinkAsset": {"linkText": link["text"], "description1": link["d1"], "description2": link["d2"]}}}})
        ops.append({"campaignAssetOperation": {"create": {"campaign": campaign, "asset": asset, "fieldType": "SITELINK"}}})
    for i, text in enumerate(plan.CALLOUTS):
        asset = c.resource("assets", -200 - i)
        ops.append({"assetOperation": {"create": {"resourceName": asset, "calloutAsset": {"calloutText": text}}}})
        ops.append({"campaignAssetOperation": {"create": {"campaign": campaign, "asset": asset, "fieldType": "CALLOUT"}}})
    return ops


def main(apply):
    client = Client()
    existing = client.search(f"SELECT campaign.id FROM campaign WHERE campaign.name = '{plan.CAMPAIGN_NAME}' AND campaign.status != 'REMOVED'")
    if existing:
        raise AdsApiError(f"同じ名前のキャンペーンがすでにあります：{plan.CAMPAIGN_NAME}")
    ops = build_operations(client)
    result = client.mutate(ops, validate_only=not apply)
    if apply:
        created = [next(iter(r.values()))["resourceName"] for r in result.get("mutateOperationResponses", []) if r]
        print(f"作成しました（キャンペーンは停止）：{len(created)} 件")
        print("\n".join(r for r in created if "/campaigns/" in r or "/adGroups/" in r))
    else:
        print(f"検証に通りました：{len(ops)} 件の操作。作成するには --apply をつけて実行")


if __name__ == "__main__":
    try:
        main(apply="--apply" in sys.argv[1:])
    except AdsApiError as e:
        print(f"失敗しました：{e}", file=sys.stderr)
        sys.exit(1)
