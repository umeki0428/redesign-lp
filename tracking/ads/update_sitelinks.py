"""登録済みのサイトリンクのリンク先を plan.SITELINKS に合わせる。既定は検証だけ、--apply で反映

サイトのページ内リンクの名前が変わったときに使う（例：#s7 → #works）[DESIGN.md §126]
python3 tracking/ads/update_sitelinks.py [--apply]
"""
import sys

import plan
from api import AdsApiError, Client

QUERY = ("SELECT campaign.name, asset.resource_name, asset.sitelink_asset.link_text, asset.final_urls FROM campaign_asset "
         f"WHERE campaign.name = '{plan.CAMPAIGN_NAME}' AND campaign_asset.field_type = 'SITELINK' "
         "AND campaign_asset.status != 'REMOVED'")


def planned_urls():
    return {link["text"]: link["url"] for link in plan.SITELINKS}


def build_operations(rows, planned):
    """リンク先が plan と違うサイトリンクだけ、finalUrls を差し替える操作にする"""
    ops = []
    for row in rows:
        asset = row["asset"]
        text = asset.get("sitelinkAsset", {}).get("linkText")
        want = planned.get(text)
        if want is None:
            print(f"plan にないサイトリンクです。そのままにします：{text}")
            continue
        if asset.get("finalUrls") == [want]:
            continue
        print(f"{text}：{asset.get('finalUrls')} → {want}")
        ops.append({"assetOperation": {"update": {"resourceName": asset["resourceName"], "finalUrls": [want]},
                                       "updateMask": "finalUrls"}})
    return ops


def main(apply):
    client = Client()
    ops = build_operations(client.search(QUERY), planned_urls())
    if not ops:
        print("直すサイトリンクはありません")
        return
    client.mutate(ops, validate_only=not apply)
    print("反映しました" if apply else "検証だけしました。反映するときは --apply")


if __name__ == "__main__":
    try:
        main("--apply" in sys.argv[1:])
    except AdsApiError as e:
        print(f"失敗しました：{e}", file=sys.stderr)
        sys.exit(1)
