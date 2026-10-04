"""今のキャンペーンを plan.py に合わせる操作を確かめる。python3 -m unittest discover tracking/ads/tests"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import plan  # noqa: E402
import sync_campaign as sync  # noqa: E402

CAMPAIGN = "customers/1/campaigns/9"


def resource(kind, temp_id):
    return f"customers/1/{kind}/{temp_id}"


def matching_live():
    """plan.py とまったく同じ状態の広告アカウント"""
    groups, keywords, ads = {}, {}, {}
    for i, g in enumerate(plan.AD_GROUPS):
        groups[g["name"]] = {"rn": f"customers/1/adGroups/{i}", "status": g["status"]}
        keywords[g["name"]] = {plan.parse_keyword(k): f"customers/1/adGroupCriteria/{i}~{n}" for n, k in enumerate(g["keywords"])}
        ads[g["name"]] = [{"rn": f"customers/1/adGroupAds/{i}~1", "headlines": plan.headlines_for(g),
                           "descriptions": plan.descriptions_for(g), "final_urls": [plan.FINAL_URL]}]
    assets = ([{"rn": f"ca/s{n}", "type": "SITELINK", "key": sync.sitelink_key(s)} for n, s in enumerate(plan.SITELINKS)]
              + [{"rn": f"ca/c{n}", "type": "CALLOUT", "key": c} for n, c in enumerate(plan.CALLOUTS)]
              + [{"rn": "ca/ss", "type": "STRUCTURED_SNIPPET", "key": sync.snippet_key()},
                 {"rn": "ca/p", "type": "PRICE", "key": sync.price_key()}])
    negatives = {sync.negative_key(kw): f"customers/1/campaignCriteria/9~n{i}" for i, kw in enumerate(plan.NEGATIVE_KEYWORDS)}
    group_negatives = {name: {sync.negative_key(kw): f"customers/1/adGroupCriteria/x~{i}" for i, kw in enumerate(words)}
                       for name, words in plan.AD_GROUP_NEGATIVES.items()}
    schedules = {key: f"customers/1/campaignCriteria/9~s{i}" for i, key in enumerate(sync.planned_schedules())}
    return {"campaign": CAMPAIGN, "groups": groups, "keywords": keywords, "ads": ads, "assets": assets,
            "negatives": negatives, "group_negatives": group_negatives, "schedules": schedules}


def kinds(ops):
    return [next(iter(op)) + "." + next(k for k in op[next(iter(op))] if k in ("create", "update", "remove")) for op in ops]


class TestSyncCampaign(unittest.TestCase):
    def test_no_operations_when_account_matches_plan(self):
        ops, _ = sync.build_operations(resource, matching_live())
        self.assertEqual(ops, [])

    def test_creates_missing_group_with_keywords_and_ad(self):
        live = matching_live()
        name = plan.AD_GROUPS[2]["name"]
        del live["groups"][name], live["keywords"][name], live["ads"][name]
        ops, _ = sync.build_operations(resource, live)
        group = plan.AD_GROUPS[2]
        self.assertEqual(kinds(ops).count("adGroupOperation.create"), 1)
        self.assertEqual(kinds(ops).count("adGroupCriterionOperation.create"), len(group["keywords"]))
        self.assertEqual(kinds(ops).count("adGroupAdOperation.create"), 1)
        created = ops[0]["adGroupOperation"]["create"]
        self.assertEqual((created["name"], created["status"], created["campaign"]), (name, group["status"], CAMPAIGN))

    def test_updates_status_and_keywords(self):
        live = matching_live()
        name = plan.AD_GROUPS[0]["name"]
        live["groups"][name]["status"] = "PAUSED" if plan.AD_GROUPS[0]["status"] == "ENABLED" else "ENABLED"
        live["keywords"][name][("古い語", "PHRASE")] = "customers/1/adGroupCriteria/0~99"
        first = plan.parse_keyword(plan.AD_GROUPS[0]["keywords"][0])
        del live["keywords"][name][first]
        ops, _ = sync.build_operations(resource, live)
        self.assertIn({"adGroupOperation": {"update": {"resourceName": live["groups"][name]["rn"], "status": plan.AD_GROUPS[0]["status"]},
                                            "updateMask": "status"}}, ops)
        self.assertIn({"adGroupCriterionOperation": {"remove": "customers/1/adGroupCriteria/0~99"}}, ops)
        self.assertIn(first[0], [op["adGroupCriterionOperation"]["create"]["keyword"]["text"]
                                 for op in ops if "create" in op.get("adGroupCriterionOperation", {})])

    def test_replaces_ad_when_copy_differs(self):
        live = matching_live()
        name = plan.AD_GROUPS[0]["name"]
        live["ads"][name][0]["headlines"] = ["前のサイトの見出し"]
        ops, _ = sync.build_operations(resource, live)
        self.assertEqual(sorted(kinds(ops)), ["adGroupAdOperation.create", "adGroupAdOperation.remove"])

    def test_replaces_changed_sitelink_and_adds_missing_assets(self):
        live = matching_live()
        live["assets"] = [a for a in live["assets"] if a["type"] not in ("PRICE", "STRUCTURED_SNIPPET")]
        live["assets"][0] = dict(live["assets"][0], key=("料金の目安", "古い説明", "x", "https://redesign.tokyo/#s8"))
        ops, _ = sync.build_operations(resource, live)
        self.assertIn({"campaignAssetOperation": {"remove": "ca/s0"}}, ops)
        field_types = [op["campaignAssetOperation"]["create"]["fieldType"] for op in ops if "create" in op.get("campaignAssetOperation", {})]
        self.assertEqual(sorted(field_types), ["PRICE", "SITELINK", "STRUCTURED_SNIPPET"])

    def test_adds_and_removes_campaign_negatives(self):
        live = matching_live()
        first = sync.negative_key(plan.NEGATIVE_KEYWORDS[0])
        del live["negatives"][first]
        live["negatives"][("古い除外", "BROAD")] = "customers/1/campaignCriteria/9~old"
        ops, _ = sync.build_operations(resource, live)
        self.assertIn({"campaignCriterionOperation": {"remove": "customers/1/campaignCriteria/9~old"}}, ops)
        self.assertIn({"campaignCriterionOperation": {"create": {"campaign": CAMPAIGN, "negative": True,
                                                                 "keyword": {"text": first[0], "matchType": first[1]}}}}, ops)

    def test_negative_match_type_follows_spaces(self):
        self.assertEqual(sync.negative_key("ココ ナラ"), ("ココ ナラ", "PHRASE"))
        self.assertEqual(sync.negative_key("相場"), ("相場", "BROAD"))

    def test_adds_missing_ad_group_negative(self):
        live = matching_live()
        name, words = next(iter(plan.AD_GROUP_NEGATIVES.items()))
        live["group_negatives"][name] = {}
        ops, _ = sync.build_operations(resource, live)
        created = [op["adGroupCriterionOperation"]["create"] for op in ops if "create" in op.get("adGroupCriterionOperation", {})]
        self.assertEqual(created, [{"adGroup": live["groups"][name]["rn"], "negative": True,
                                    "keyword": {"text": w, "matchType": sync.negative_key(w)[1]}} for w in words])

    def test_sets_ad_schedule_for_every_day(self):
        live = matching_live()
        live["schedules"] = {}
        ops, _ = sync.build_operations(resource, live)
        schedules = [op["campaignCriterionOperation"]["create"]["adSchedule"] for op in ops
                     if "adSchedule" in op.get("campaignCriterionOperation", {}).get("create", {})]
        self.assertEqual(len(schedules), 7)
        self.assertTrue(all(s["startHour"] == plan.AD_SCHEDULE["start_hour"] and s["endHour"] == plan.AD_SCHEDULE["end_hour"]
                            for s in schedules))


if __name__ == "__main__":
    unittest.main()
