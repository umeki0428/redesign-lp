"""検索キャンペーンの中身。docs/ADS.md と一致させる"""
import unicodedata

FINAL_URL = "https://redesign.tokyo/"
CAMPAIGN_NAME = "検索_ホームページ制作_REDESIGN"
DAILY_BUDGET_YEN = 1600  # 月 5 万円 [2026-09-21確定]
CPC_CEILING_YEN = 800
GEO_JAPAN = "geoTargetConstants/2392"
LANG_JAPANESE = "languageConstants/1005"

AD_GROUPS = [
    {"name": "リニューアル", "status": "ENABLED",
     "keywords": ["ホームページ リニューアル", "web サイト リニューアル", "ホームページ 集客", "集客 ホームページ"]},
    {"name": "制作会社・依頼", "status": "ENABLED",
     "keywords": ["ホームページ 制作 会社", "ホームページ 作成 依頼", "コーポレート サイト 制作", "ホームページ 作成 会社"]},
    {"name": "費用・相場", "status": "ENABLED",
     "keywords": ["ホームページ 作成 費用", "ホームページ 制作 相場", "ホームページ 作成 相場", "ホームページ 制作 費用"]},
    # 単価が高く月 5 万円では回らないため、停止で作っておく
    {"name": "LP制作", "status": "PAUSED", "keywords": ["lp 制作", "lp 制作 会社"]},
]

NEGATIVE_KEYWORDS = [
    "格安", "安い", "激安", "低価格", "無料", "自分で", "作り方", "初心者", "簡単", "テンプレート", "html",
    "wix", "ペライチ", "jimdo", "google サイト", "グーグル サイト", "ココナラ", "クラウドワークス",
    "求人", "転職", "アルバイト", "バイト", "年収", "スクール", "講座", "独学", "資格", "とは", "web 幹事",
]

HEADLINES = [
    "ホームページ制作のRE DESIGN", "リニューアルのご相談は無料", "料金の目安をサイトで公開中",
    "考える人と、つくる人を分けない", "誰に何をどう伝えるかから設計", "設計者が公開まで関わります",
    "名刺代わりの小さなサイトも", "コーポレートサイト制作", "LP制作にも対応", "公開後の更新・改善も支援",
    "ご提案・お見積りまで無料", "売り込みはしません", "中小企業のホームページ制作",
    "事業の整理から一緒に考えます", "WordPressで更新しやすく",
]

DESCRIPTIONS = [
    "事業と顧客を理解し、誰に何をどう伝えるかを設計。設計した人が公開まで関わります。",
    "名刺代わりの小さなサイトから、コーポレートサイト・LPまで。料金の目安はサイトで公開中。",
    "ご相談・ご提案・お見積りまでは無料。売り込みはしません。まずは現状の整理からどうぞ。",
    "公開後も更新・保守、アクセス解析と改善、広告運用まで。必要な範囲で継続して支援します。",
]

SITELINKS = [
    {"text": "料金の目安", "d1": "制作内容ごとの費用の目安", "d2": "公開後のサポートの料金も", "url": FINAL_URL + "#s8"},
    {"text": "制作の流れ", "d1": "ご相談から運用までの6段階", "d2": "ご提案までは無料です", "url": FINAL_URL + "#s9"},
    {"text": "制作実績", "d1": "これまでに制作したサイト", "d2": "担当した範囲もご紹介", "url": FINAL_URL + "#s7"},
    {"text": "よくあるご質問", "d1": "費用・期間・公開後のこと", "d2": "ご相談前の疑問にお答え", "url": FINAL_URL + "#s11"},
]

CALLOUTS = ["相談無料", "料金の目安を公開", "売り込みなし", "公開後の支援あり"]

# Google 広告の文字数（全角は 2 と数える）
LIMITS = {"headline": 30, "description": 90, "sitelink_text": 25, "sitelink_desc": 35, "callout": 25, "keyword": 80}


def ad_width(text):
    return sum(2 if unicodedata.east_asian_width(ch) in ("W", "F") else 1 for ch in text)
