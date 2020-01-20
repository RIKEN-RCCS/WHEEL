# WHEEL administrator's guide
## prerequisites
WHEELの実行にあたって、必須のソフトウェアは以下のとおりです。
- node.js (12以降)
- git
- python3
- jupyter

なお、これらの必須ソフトウェアを全てインストールしたdocker container用のDockerFileもgitリポジトリに含まれており、こちらを用いてWHEELをコンテナ上で運用することを推奨しています。

## 動作確認環境
以下の2種類のホスト環境で動作確認を行なっています。
1.  ubuntu
- Ubuntu 18.04.2 LTS (Bionic Beaver)
- Docker version 18.09.7, build 2d0083d

2.  macOS
- macOS Catalina (v10.15.2)
- docker desktop 2.1.0.5(40693)

## インストール方法
### dockerを利用する場合
dockerを利用して、WHEELを起動する場合、以下の手順でdocker imageを作成します。

```
> git clone https://gitlab.com/aicshud/WHEEL.git
> cd WHEEL
> docker build -t wheel .
```

### dockerを使わずにWHEELを起動する場合(非推奨)
dockerを使わずにホストOSでWHEELを起動する場合は以下の手順でインストールを行ないます。
```
> git clone https://gitlab.com/aicshud/WHEEL.git
> cd WHEEL
> npm install
```

`npm install` を実行すると依存するパッケージがnode\_modules以下にインストールされますが、一部のOS(RHELおよびCentOS 7)ではnodegitのインストールに失敗する現象が確認されています。
この場合、`npm install`終了後に次の手順で、nodegitのみを再ビルドしてください。

```
> cd WHEEL/node_modules/nodegit
> BUILD_ONLY=yes npm install
```

## インストール後の設定
### 証明書
WHEELはhttpsおよびwssにて通信を行なうため、起動する前にサーバ証明書等の設定が必要です。
秘密鍵ファイルを `app/db/server.key`、証明書ファイルを `app/db/server.crt`という名前で配置してください。
__BUG__ 正しい鍵および証明書ファイルを配置せずにWHEELを起動すると、後述の`remotehost.json`および`projectList.json`ファイルが破壊されるという既知の問題があります(2020/1/20時点)

### server設定
WHEELの動作に影響するパラメータは、`app/db/server.json`ファイルにjson形式で記述します。
設定可能なプロパティは以下のとおりです。

server.jsonの既定値

```
    "port": 8089,
    "remotehostJsonFile": "./remotehost.json",
    "projectListJsonFile": "./projectList.json",
    "interval": 1000,
    "defaultCleanupRemoteRoot": true,
    "jupyter": true,
    "jupyterPort": "auto",
    "logFilename": "wheel.log",
    "numLogFiles": 5,
    "maxLogSize": 8388608,
    "compressLogFile": true,
    "numJobOnLocal": 2,
    "defaultTaskRetryCount": 1,
    "shutdownDelay": 0
```

#### port (整数)
WHEELが待ち受けるポート番号を設定します。
整数値かつ、利用可能なポート番号を指定してください。

#### remotehostJsonFile (文字列)
リモートホスト設定を記載するJsonファイルのファイル名を指定します。
app/dbディレクトリからの相対パスか絶対パスで指定します。

#### projectListJsonFile(文字列)
WHEELが管理するプロジェクトの一覧を記載するJsonファイルのファイル名を指定します。
app/dbディレクトリからの相対パスか絶対パスで指定します。

#### interval (整数)
一部のイベントループを実行するインターバル(ミリ秒単位)

#### defaultCleanupRemoteRoot (真偽値)

プロジェクトのルートコンポーネントでリモート環境に作成した一時ファイルを削除するかどうかの設定が
"上位コンポーネントを参照"となっていた時に、削除する(True)として扱うか、削除しない(False)として扱うかの設定です。

#### jupyter(文字列 | 真偽値)
jupyter notebookの実行ファイル名を指定します。PATHが通っていれば絶対PATHではなくコマンド名のみの記載で構いません。
文字列以外の値が設定された時は、truethyな値であれば"jupyter"を呼び出し、それ以外の時はjupyter notebook機能は無効になります。

#### jupyterPort (整数 | "auto")
jupyter notebookを起動する時のポート番号を指定します。無効なポート番号(0以下や65536以上、数値以外の値)が指定された場合はWHEEL自身が待ち受けているポート番号+1の値を使います。

#### logFilename (文字列)
ログファイルのファイル名を指定します。

#### numLogFiles (整数)
ログファイルのローテーションを行なった時に保持するファイル数を指定します。

#### maxLogSize (整数)
ログファイルのローテーションを行うファイルサイズのしきい値を指定します。

#### compressLogFile (真偽値)
ログファイルのローテーションを行なった時に古いファイルを圧縮するかどうかを指定します。

#### numJobOnLocal (整数)
localhostで実行するtaskの同時実行本数を指定します。

#### defaultTaskRetryCount (整数)
taskのリトライ機能を有効にした時にリトライする回数のデフォルト値
本設定の値にかかわらず、taskコンポーネント側でretryを指定しなければretryは行なわれない

#### shutdownDelay (整数)
workflow画面に接続するクライアントが0になってからWHEEL自身のプロセスをkillするまでの待ち時間(ミリ秒単位)

### jobScheduler設定
WHEELが利用するジョブスケジューラシステムに関する設定は `app/db/jobScheduler.json`ファイルにjson形式で記述します。
本設定ファイルは通常の運用の範囲内では変更する必要はありませんが、
ジョブ投入/ステータスチェック/キャンセル時に想定していないオプションが必要になった時や、
ジョブスケジューラ側のソフトウェアの更新などにより、出力されるメッセージが変わった時などに変更する必要があります。

## 起動・終了方法
### dockerを利用する場合
インストール時に作成したdocker imageを起動してください。CMD行にWHEELを起動するコマンドを記述しているので、docker runのみで
WHEELのプロセスが立ち上がります。
なお、ホストとのストレージの共有(-v)およびポートフォワードの設定(-p)の指定は別途必要です。

### dockerを利用しない場合
WHEELのインストールディレクトリまたは、そのサブディレクトリ内で以下のコマンドを実行してください。
```
> npm run start
```

## WHEELが動作中に作成するファイル
WHEELが動作中に参照するユーザデータの保存先として、以下の2ファイルが使われます。
(ファイル名は、前述のserver.jsonで変更することもできます。)

- app/db/remotehost.json
- app/db/projectList.json

remotehost.jsonには、ユーザが接続する外部サーバのホスト名、IDなどの情報が平文で保存されています。
定期的にバックアップを取るなど障害への準備を行なうとともに、取り扱いに注意してください。
なお、パスワードおよび秘密鍵のパスフレーズは本ファイル以外にも一切保存しておらず、必要になる都度ユーザから入力を受け取っています。

projectList.jsonには、ユーザが使用するワークフロープロジェクトディレクトリのパスとそれを識別するためのID文字列が保存されています。
本ファイルも定期的にバックアップをとるなどして障害発生時に備えてください。


