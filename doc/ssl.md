#SSL設定手順
dev2018-3ブランチ以降では、https通信が必須となります。
このため、起動時に以下の2つのファイルを配置していないと、WHEELは起動しません。

秘密鍵ファイル: app/db/server.key
サーバ証明書:   app/db/server.crt

localhostでのサービス提供時など、正規の証明書が使えない場合は以下の手順で自己証明書を作成して用意してください。
[自己証明書作成ガイド](./self-signed_certification.md)