"""営業だった問い合わせを広告の CV から取り消す操作を確かめる。python3 -m unittest discover tracking/ads/tests"""
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import retract_lead  # noqa: E402

JST = timezone(timedelta(hours=9))


class TestRetractLead(unittest.TestCase):
    def test_accepts_only_site_lead_ids(self):
        self.assertTrue(retract_lead.is_lead_id("L2609301530-a7k2"))
        for bad in ["", "L2609301530", "2609301530-a7k2", "L2609301530-a7k2' OR 1=1", "l2609301530-a7k2"]:
            with self.subTest(bad=bad):
                self.assertFalse(retract_lead.is_lead_id(bad))

    def test_builds_retraction_by_order_id(self):
        now = datetime(2026, 10, 1, 9, 5, 0, tzinfo=JST)
        adjustments = retract_lead.build_adjustments("customers/1/conversionActions/2", ["L2609301530-a7k2"], now)
        self.assertEqual(adjustments, [{
            "conversionAction": "customers/1/conversionActions/2",
            "adjustmentType": "RETRACTION",
            "adjustmentDateTime": "2026-10-01 09:05:00+09:00",
            "orderId": "L2609301530-a7k2",
        }])

    def test_report_lists_only_succeeded_ids(self):
        import io
        from contextlib import redirect_stdout
        out = io.StringIO()
        with redirect_stdout(out):
            retract_lead.report({"results": [{"orderId": "L2609301530-a7k2"}, {}],
                                 "partialFailureError": {"message": "not found"}}, apply=True)
        self.assertIn("取り消しました：L2609301530-a7k2", out.getvalue())
        self.assertIn("not found", out.getvalue())


if __name__ == "__main__":
    unittest.main()
