"""広告文の文字数と、BRIEF の禁止表現を確かめる。python3 -m unittest discover tracking/ads/tests"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import plan  # noqa: E402

# BRIEF §4・§5・§7：体制の誇張、成果の約束、金額（仮のため）、AI を主役にしない
BANNED = ["一人", "自社一貫", "一括", "外注しない", "専門家チーム", "必ず", "確実", "保証", "No.1", "売上", "万円", "AI"]


def all_texts():
    return (plan.HEADLINES + plan.DESCRIPTIONS + plan.CALLOUTS
            + [s[k] for s in plan.SITELINKS for k in ("text", "d1", "d2")])


class TestPlan(unittest.TestCase):
    def test_width_counts_fullwidth_as_two(self):
        self.assertEqual(plan.ad_width("あA"), 3)

    def test_lengths(self):
        cases = ([(t, "headline") for t in plan.HEADLINES] + [(t, "description") for t in plan.DESCRIPTIONS]
                 + [(t, "callout") for t in plan.CALLOUTS]
                 + [(s["text"], "sitelink_text") for s in plan.SITELINKS]
                 + [(s[k], "sitelink_desc") for s in plan.SITELINKS for k in ("d1", "d2")])
        for text, kind in cases:
            with self.subTest(text=text):
                self.assertLessEqual(plan.ad_width(text), plan.LIMITS[kind])

    def test_counts(self):
        self.assertTrue(3 <= len(plan.HEADLINES) <= 15)
        self.assertTrue(2 <= len(plan.DESCRIPTIONS) <= 4)
        self.assertEqual(len(set(plan.HEADLINES)), len(plan.HEADLINES))

    def test_no_banned_words(self):
        for text in all_texts():
            for word in BANNED:
                with self.subTest(text=text, word=word):
                    self.assertNotIn(word, text)

    def test_negatives_cover_confirmed_exclusions(self):
        for word in ["格安", "安い"]:
            self.assertIn(word, plan.NEGATIVE_KEYWORDS)

    def test_negatives_do_not_block_own_keywords(self):
        keywords = [kw for g in plan.AD_GROUPS for kw in g["keywords"]]
        for neg in plan.NEGATIVE_KEYWORDS:
            for kw in keywords:
                with self.subTest(neg=neg, kw=kw):
                    self.assertNotIn(neg, kw)

    def test_only_lp_group_is_paused(self):
        paused = [g["name"] for g in plan.AD_GROUPS if g["status"] == "PAUSED"]
        self.assertEqual(paused, ["LP制作"])


if __name__ == "__main__":
    unittest.main()
