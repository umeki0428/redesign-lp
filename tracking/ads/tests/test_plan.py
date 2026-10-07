"""広告文の文字数と、BRIEF の禁止表現を確かめる。python3 -m unittest discover tracking/ads/tests"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import plan  # noqa: E402
import update_sitelinks  # noqa: E402

SITE_HTML = Path(__file__).resolve().parents[3] / "site" / "index.html"

# BRIEF §4・§7：体制の誇張、成果の約束、AI を主役にしない。金額は 2026-09-30 に確定
BANNED = ["一人", "自社一貫", "一括", "外注しない", "専門家チーム", "必ず", "確実", "保証", "No.1", "売上", "AI"]


def all_texts():
    ad = [t for g in plan.AD_GROUPS for t in plan.headlines_for(g) + plan.descriptions_for(g)]
    return ad + plan.CALLOUTS + [s[k] for s in plan.SITELINKS for k in ("text", "d1", "d2")]


def keyword_texts():
    return [plan.parse_keyword(kw)[0] for g in plan.AD_GROUPS for kw in g["keywords"]]


class TestPlan(unittest.TestCase):
    def test_width_counts_fullwidth_as_two(self):
        self.assertEqual(plan.ad_width("あA"), 3)

    def test_lengths(self):
        cases = ([(t, "headline") for g in plan.AD_GROUPS for t in plan.headlines_for(g)]
                 + [(t, "description") for g in plan.AD_GROUPS for t in plan.descriptions_for(g)]
                 + [(t, "callout") for t in plan.CALLOUTS]
                 + [(s["text"], "sitelink_text") for s in plan.SITELINKS]
                 + [(s[k], "sitelink_desc") for s in plan.SITELINKS for k in ("d1", "d2")])
        for text, kind in cases:
            with self.subTest(text=text):
                self.assertLessEqual(plan.ad_width(text), plan.LIMITS[kind])

    def test_counts_per_group(self):
        for g in plan.AD_GROUPS:
            with self.subTest(group=g["name"]):
                heads, descs = plan.headlines_for(g), plan.descriptions_for(g)
                self.assertEqual(15, len(heads))
                self.assertEqual(4, len(descs))
                self.assertEqual(len(set(heads)), len(heads))
                self.assertEqual(len(set(descs)), len(descs))

    def test_keywords_unique(self):
        texts = keyword_texts()
        self.assertEqual(len(set(texts)), len(texts))

    def test_parse_keyword(self):
        self.assertEqual(plan.parse_keyword("[a b]"), ("a b", "EXACT"))
        self.assertEqual(plan.parse_keyword("a b"), ("a b", "PHRASE"))

    def test_no_banned_words(self):
        for text in all_texts():
            for word in BANNED:
                with self.subTest(text=text, word=word):
                    self.assertNotIn(word, text)

    def test_negatives_cover_confirmed_exclusions(self):
        for word in ["格安", "安い"]:
            self.assertIn(word, plan.NEGATIVE_KEYWORDS)

    def test_negatives_do_not_block_own_keywords(self):
        keywords = keyword_texts()
        for neg in plan.NEGATIVE_KEYWORDS:
            for kw in keywords:
                with self.subTest(neg=neg, kw=kw):
                    self.assertNotIn(neg, kw)

    def test_paused_groups(self):
        paused = [g["name"] for g in plan.AD_GROUPS if g["status"] == "PAUSED"]
        self.assertEqual(sorted(paused), sorted(["比較・選び方", "東京", "公開後の支援", "費用・相場", "LP制作"]))

    def test_active_groups_match_initial_budget_focus(self):
        active = [g["name"] for g in plan.AD_GROUPS if g["status"] == "ENABLED"]
        self.assertEqual(active, ["リニューアル", "制作会社・依頼", "はじめて・起業", "見積もり"])

    def test_confirmed_prices_match_site(self):
        html = SITE_HTML.read_text(encoding="utf-8")
        for amount in (10, 30, 50):   # LP制作は 2026-10-07 に 15 → 10 万円〜 [DESIGN.md §132]
            self.assertIn(f'<b>{amount}</b><span>万円〜<small>税込</small>', html)
        all_ads = "\n".join(all_texts())
        self.assertIn("LP制作10万円〜税込", all_ads)
        self.assertIn("ホームページ30万円〜税込", all_ads)

    def test_price_asset_has_at_least_three_offerings(self):
        self.assertGreaterEqual(len(plan.PRICE_OFFERINGS), 3)
        for item in plan.PRICE_OFFERINGS:
            self.assertLessEqual(plan.ad_width(item["header"]), 25)
            self.assertLessEqual(plan.ad_width(item["description"]), 25)

    def test_sitelink_anchors_exist_on_site(self):
        html = SITE_HTML.read_text(encoding="utf-8")
        for link in plan.SITELINKS:
            anchor = link["url"].split("#", 1)[1]
            with self.subTest(text=link["text"]):
                self.assertIn(f'id="{anchor}"', html)

    def test_update_sitelinks_only_changes_different_urls(self):
        rows = [
            {"asset": {"resourceName": "a/1", "sitelinkAsset": {"linkText": "制作実績"}, "finalUrls": ["https://redesign.tokyo/#s7"]}},
            {"asset": {"resourceName": "a/2", "sitelinkAsset": {"linkText": "料金の目安"}, "finalUrls": [plan.FINAL_URL + "#price"]}},
            {"asset": {"resourceName": "a/3", "sitelinkAsset": {"linkText": "計画にない"}, "finalUrls": ["x"]}},
        ]
        ops = update_sitelinks.build_operations(rows, update_sitelinks.planned_urls())
        self.assertEqual(ops, [{"assetOperation": {"update": {"resourceName": "a/1", "finalUrls": [plan.FINAL_URL + "#works"]},
                                                   "updateMask": "finalUrls"}}])


if __name__ == "__main__":
    unittest.main()
