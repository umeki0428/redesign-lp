# お問い合わせフォームの GAS

サイトのフォーム（`design/v15/index.html` の #s12）から Google フォームへ送信し、
送信時に次の 3 つを行う [DESIGN.md §68]。

1. 相談者への自動返信メール
2. 自分への通知メール（返信すると相談者に届く）
3. Chatwork への通知

## ファイル

| ファイル | 中身 |
|---|---|
| `config.gs` | 項目と選択肢の定義。サイトと一字一句そろえる |
| `setup.gs` | フォーム・回答シートの作成、トリガーの登録、entry ID の出力 |
| `submit.gs` | 送信時の処理（メール・Chatwork） |
| `message.gs` | 文面をつくる関数 |
| `test/` | `node --test gas/test/*.test.js`。サイトとの選択肢の一致も確かめる |

## セットアップ

1. script.google.com で新しいプロジェクトを作る（名前は「RE DESIGN お問い合わせ」など）
2. `config.gs`・`message.gs`・`setup.gs`・`submit.gs` を同じ名前のファイルとして貼る
   - プロジェクトの設定で「appsscript.json をエディタで表示」をオンにし、`appsscript.json` も貼る
3. プロジェクトの設定 → スクリプト プロパティに次を入れる

   | プロパティ | 値 |
   |---|---|
   | `ADMIN_EMAIL` | 通知を受け取るメールアドレス |
   | `CHATWORK_TOKEN` | Chatwork の API トークン（Chatwork の「サービス連携」→「API トークン」） |
   | `CHATWORK_ROOM_ID` | 通知を送るルームの ID（ルームの URL の `#!rid` の後ろの数字） |
   | `CHATWORK_TO_ID` | 任意。自分宛てに [To] を付けるならアカウント ID |

4. エディタで `setupContactForm` を選んで実行する。初回だけ権限の許可を求められる
5. 実行ログに出た JSON（`action` と `entries`）を、サイトの実装に渡す
6. `testNotify` を実行し、通知メールと Chatwork が届くか確かめる

## 注意

- 自動返信は、このスクリプトを実行した Google アカウントの Gmail から送られる
- 同じ宛先への自動返信は 6 時間に 3 通まで（第三者への大量送信を防ぐ）
- Google フォームの質問は必須にしていない。必須の確認はサイトで行う
- 選択肢を変えるときは、`config.gs` とサイトの両方を直し、テストを流してから、フォームを作り直す
  （スクリプトプロパティの `FORM_ID` を消して `setupContactForm` を再実行。entry ID も変わる）
