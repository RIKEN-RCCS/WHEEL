WHEELの動作に影響するパラメータのうち一部のものは```app/db/server.json```ファイルに記述することで変更することができます。

本ドキュメントではこのファイルで設定可能なパラメータについて解説します。

server.jsonの既定値

```
    "port": 8080,
    "remotehostJsonFile": "./remotehost.json",
    "useraccountJsonFile": "./useraccount.json",
    "projectListJsonFile": "./projectList.json",
    "interval": 1000,
    "defaultCleanupRemoteRoot": true,
    "saltRound": 10,
    "admin": "admin",
    "jupyter": true,
    "jupyterPort": "auto",
    "logFilename": "wheel.log",
    "numLogFiles": 5,
    "maxLogSize": 8388608,
    "compressLogFile": true,
    "numJobOnLocal": 2
```

## port (整数)
WHEELが待ち受けるポート番号を設定します。
整数値かつ、利用可能なポート番号を指定してください。

## remotehostJsonFile (文字列)
リモートホスト設定を記載するJsonファイルのファイル名を指定します。
app/dbディレクトリからの相対パスか絶対パスで指定します。

## interval (数値)

## defaultCleanupRemoteRoot (真偽値)

プロジェクトのルートコンポーネントでリモート環境に作成した一時ファイルを削除するかどうかの設定が
"上位コンポーネントを参照"となっていた時に、削除する(True)として扱うか、削除しない(False)として扱うかの設定です。

## saltRound (整数)
## jupyter(文字列)
jupyter notebookの実行ファイル名を指定します。PATHが通っていれば絶対PATHではなくコマンド名のみの記載で構いません。

## jupyterPort (整数|auto)
jupyter notebookを起動する時のポート番号を指定します。無効なポート番号(0以下や65536以上、数値以外の値)が指定された場合はWHEEL自身が待ち受けているポート番号+1の値を使います。

## logFilename (文字列)
ログファイルのファイル名を指定します。

## numLogFiles (整数)
ログファイルのローテーションを行なった時に保持するファイル数を指定します。

## maxLogSize (整数)
ログファイルのローテーションを行うファイルサイズのしきい値を指定します。

## compressLogFile (真偽値)
ログファイルのローテーションを行なった時に古いファイルを圧縮するかどうかを指定します。

## numJobOnLocal (整数)
localhostで実行するtaskの同時実行本数を指定します。