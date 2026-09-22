"""コンバージョン「問い合わせ」を作り、GTM に入れる ID とラベルを出す。すでにあれば作らずに表示だけ

python3 tracking/ads/create_conversion.py
"""
import re
import sys

from api import AdsApiError, Client

NAME = "問い合わせ（フォーム送信）"


def find(client):
    rows = client.search(
        "SELECT conversion_action.resource_name, conversion_action.tag_snippets FROM conversion_action "
        f"WHERE conversion_action.name = '{NAME}' AND conversion_action.status != 'REMOVED'")
    return rows[0]["conversionAction"] if rows else None


def create(client):
    client.mutate([{"conversionActionOperation": {"create": {
        "name": NAME,
        "type": "WEBPAGE",
        "category": "SUBMIT_LEAD_FORM",
        "status": "ENABLED",
        "countingType": "ONE_PER_CLICK",
        "clickThroughLookbackWindowDays": 90,
        "valueSettings": {"defaultValue": 0, "alwaysUseDefaultValue": True},
        "primaryForGoal": True,
    }}}], validate_only=False)


def send_to(action):
    """タグの断片から 'AW-123/abc' を取り出す"""
    for snippet in action.get("tagSnippets", []):
        m = re.search(r"'send_to':\s*'(AW-\d+/[\w-]+)'", snippet.get("eventSnippet", ""))
        if m:
            return m.group(1)
    raise AdsApiError("タグの断片から ID とラベルを読み取れませんでした")


def main():
    client = Client()
    action = find(client)
    if action is None:
        create(client)
        action = find(client)
        print(f"作成しました：{NAME}")
    else:
        print(f"すでにあります：{NAME}")
    conversion_id, label = send_to(action)[3:].split("/")
    print(f"GTM の変数「広告 コンバージョン ID」：{conversion_id}")
    print(f"GTM の変数「広告 コンバージョン ラベル」：{label}")


if __name__ == "__main__":
    try:
        main()
    except AdsApiError as e:
        print(f"失敗しました：{e}", file=sys.stderr)
        sys.exit(1)
