"""Google 広告 API（REST）の呼び出し。認証情報は google-ads リポジトリのものを読む（ここには置かない）"""
import json
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://googleads.googleapis.com/v23"
CUSTOMER_ID = "6898477992"  # RE DESIGN（広告）
LOGIN_CUSTOMER_ID = "8690753546"  # MCC RE DESIGN

ADS_REPO = Path("/Users/yuuki/Desktop/02_開発/Github/google-ads")
CREDS_FILE = ADS_REPO / ".google-ads-credentials.json"
MCP_FILE = ADS_REPO / ".mcp.json"


class AdsApiError(RuntimeError):
    pass


def _developer_token():
    try:
        return json.loads(MCP_FILE.read_text())["mcpServers"]["google-ads"]["env"]["GOOGLE_ADS_DEVELOPER_TOKEN"]
    except (OSError, KeyError, json.JSONDecodeError) as e:
        raise AdsApiError(f"開発者トークンを読めません（{MCP_FILE}）: {e}") from e


def _access_token():
    try:
        creds = json.loads(CREDS_FILE.read_text())
    except (OSError, json.JSONDecodeError) as e:
        raise AdsApiError(f"認証情報を読めません（{CREDS_FILE}）: {e}") from e
    body = urllib.parse.urlencode({
        "client_id": creds["client_id"],
        "client_secret": creds["client_secret"],
        "refresh_token": creds["refresh_token"],
        "grant_type": "refresh_token",
    }).encode()
    try:
        with urllib.request.urlopen("https://oauth2.googleapis.com/token", body) as r:
            return json.load(r)["access_token"]
    except urllib.error.HTTPError as e:
        raise AdsApiError(f"アクセストークンを取れません: HTTP {e.code} {e.read().decode()[:300]}") from e


class Client:
    def __init__(self, customer_id=CUSTOMER_ID):
        self.customer_id = customer_id
        self._headers = {
            "Authorization": f"Bearer {_access_token()}",
            "developer-token": _developer_token(),
            "login-customer-id": LOGIN_CUSTOMER_ID,
            "Content-Type": "application/json",
        }

    def _post(self, path, payload):
        req = urllib.request.Request(f"{API}/customers/{self.customer_id}/{path}", json.dumps(payload).encode(), self._headers)
        try:
            with urllib.request.urlopen(req) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            raise AdsApiError(f"{path}: HTTP {e.code}\n{_format_errors(e.read().decode())}") from e

    def search(self, query):
        return self._post("googleAds:search", {"query": query}).get("results", [])

    def mutate(self, operations, validate_only=True):
        """GoogleAdsService.Mutate。すべて成功するか、何も作られないか（atomic）"""
        return self._post("googleAds:mutate", {"mutateOperations": operations, "validateOnly": validate_only})

    def resource(self, kind, temp_id):
        """同じ mutate の中で参照し合うための仮の resource name（負の ID）"""
        return f"customers/{self.customer_id}/{kind}/{temp_id}"


def _format_errors(raw):
    try:
        details = json.loads(raw)["error"]["details"][0]["errors"]
    except (KeyError, IndexError, json.JSONDecodeError):
        return raw[:1500]
    lines = []
    for err in details:
        field = ".".join(e.get("fieldName", "") + (f"[{e['index']}]" if "index" in e else "") for e in err.get("location", {}).get("fieldPathElements", []))
        lines.append(f"- {json.dumps(err.get('errorCode'), ensure_ascii=False)} {err.get('message', '')} {field}")
    return "\n".join(lines)
