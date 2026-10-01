"""営業だった問い合わせを、Google 広告のコンバージョンから取り消す。既定は検証だけ、--apply で反映 [DESIGN.md §127]

lead_id は、通知メール・Chatwork・回答シートの「流入元（自動）」の 1 行目にある（例：L2609301530-a7k2）。
広告をクリックして来た問い合わせだけが広告の CV になっている。それ以外は「見つからない」と出るが、取り消す必要はない。
GA4 の generate_lead は取り消せない。

python3 tracking/ads/retract_lead.py L2609301530-a7k2 [L... ...] [--apply]
"""
import re
import sys
from datetime import datetime, timedelta, timezone

from api import AdsApiError, Client
from create_conversion import NAME, find

JST = timezone(timedelta(hours=9))
LEAD_ID = re.compile(r"^L\d{10}-[a-z0-9]{1,4}$")


def is_lead_id(value):
    return bool(LEAD_ID.match(value))


def build_adjustments(conversion_action, lead_ids, now):
    stamp = now.strftime("%Y-%m-%d %H:%M:%S%z")
    stamp = stamp[:-2] + ":" + stamp[-2:]  # +0900 → +09:00
    return [{"conversionAction": conversion_action, "adjustmentType": "RETRACTION",
             "adjustmentDateTime": stamp, "orderId": lead_id} for lead_id in lead_ids]


def report(response, apply):
    """成功した分は results に orderId が入る。失敗した分は空のまま"""
    done = [r["orderId"] for r in response.get("results", []) if r.get("orderId")]
    error = response.get("partialFailureError")
    if error:
        print(f"取り消せなかったものがあります：{error.get('message', error)}")
        print("CONVERSION_NOT_FOUND は、広告から来た問い合わせではないか、まだ広告側に反映されていない（1 日ほど待つ）という意味です")
    verb = "取り消しました" if apply else "検証を通りました（反映するときは --apply）"
    print(f"{verb}：{', '.join(done) if done else 'なし'}")


def main(args):
    apply = "--apply" in args
    lead_ids = [a for a in args if a != "--apply"]
    bad = [a for a in lead_ids if not is_lead_id(a)]
    if not lead_ids or bad:
        raise AdsApiError(f"lead_id の形が違います：{bad or '（指定なし）'}。例：L2609301530-a7k2")
    client = Client()
    action = find(client)
    if action is None:
        raise AdsApiError(f"コンバージョン「{NAME}」が見つかりません")
    adjustments = build_adjustments(action["resourceName"], lead_ids, datetime.now(JST))
    report(client.upload_conversion_adjustments(adjustments, validate_only=not apply), apply)


if __name__ == "__main__":
    try:
        main(sys.argv[1:])
    except AdsApiError as e:
        print(f"失敗しました：{e}", file=sys.stderr)
        sys.exit(1)
