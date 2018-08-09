# 詳細設計書
## データ構造
wheelでは、ある解析を実行するための一連のプログラム実行や
入出力の受け渡しをまとめたものをProjectとよびます。

Projectの実体はnode.jsが動作するマシン上の任意のディレクトリ(以降はprojectRootとします)
以下のディレクトリ一式で、プロジェクト毎にgitによって管理されます。
また、projectRootのディレクトリ名は末尾に.wheelが付与されています。

projectRootには次のような形式のJSONファイル(以降はprojectJSONとします)が
含まれている必要があります。
```
{
    "name": "Project name",
    "description": "This is new Project.",
    "state": "not-started",
    "root" : "/home/hoge/project.wheel",
    "projectJSON": "./swf.prj.json",
    "rootWorkflow": "./define.wf.json",
    "componentPath":{
      "xxxx-xx-xxx1": "./foo/bar",
      "xxxx-xx-xxx2": "./foo",
      "xxxx-xx-xxx3": "./fizz",
      "xxxx-xx-xxx4": "./foo/baz",
    }
}
```

projectJSONの各プロパティに含まれる値は次のとおりです。

property      | description
--------------|--------------------------------------
name          | プロジェクト名(projectRootのディレクトリ名から.wheelを除いたもの)
description   | ユーザがプロジェクトにつける任意の説明文
state         | プロジェクトの実行状態を表す文字列
root          | projectRootディレクトリの絶対パス
projectJSON   | projectJSONファイルへのprojectRootからの相対パス
rootWorkflow  | rootWorkflowファイルへのprojectRootからの相対パス
componentPath | プロジェクトに含まれる全コンポーネントのIDとprojectRootからの相対パス


projectJsonのプロパティのうち、"path"にはprojectRootからprojectJsonファイルへの相対パスが記述されています。
また、 path\_workflowには、そのプロジェクトの中で最初に実行されるworkflowへの
projectRootからの相対パスが記述されています。




workflowは次に示す様々な種類のworkflowComponentを0個以上含むtree構造を表すものです。

- Task
- If
- Workflow
- ParameterStudy
- For
- While
- Foreach

個々のworkflowComponentの説明は、クラス構造の章を参照してください。
これらのworkflowComponentの実体も、projectRoot以下に存在するディレクトリで
ユーザが各コンポーネントの処理に必要なファイルなどは、対応するディレクトリ以下に
配置すれば処理中に参照することができます。
また、出力されたファイルはこのディレクトリに配置されます。

各workflowComponentはメモリ上では親ノードのArray型プロパティであるnodesに格納されており、
TaskとIf以外のcomponentはそれぞれのプロパティで指定された名前でJson形式のテキストファイルとして
保存されます。
TaskとIfは親ノードのJsonファイルのnodesエントリの要素として出力されます。

## クラス構成
workflowおよびその実行に関連するクラスのクラス図は次のとおりです。

![クラス図](./classDiagram.svg)

BaseWorkflowComponentの各派生クラスのプロパティのうち、エンドユーザが設定することのできる項目は次のとおりです。

### Task
property        | type         | description
----------------|--------------|--------------
name            | string       | ノードを識別するためのlabel
description     | string       | ノードの説明文
previous        | number[]     | 先行ノードのindex
next            | number[]     | 後続ノードのindex
inputFiles      | inputFile[]  | 先行ノードから受け取るファイル
outputFiles     | outputFile[] | 後続ノードへ渡すファイル
script          | string       | Task内の処理を記述したスクリプトのファイル名
host            | string       | Taskを実行するhost、localhostまたは登録済のremotehostのlabelを指定することができる
useJobScheduler | boolean      | scriptをバッチスケジューラ経由で実行するか直接実行するかのフラグ
queue           | string       | ジョブの投入先キュー(useJobSchedulerがfalseの時は使われない)
cleanupFlag     | number       | リモート環境に作成した一時ファイルを削除するかどうかのフラグ *1
include         | string       | リモート環境から回収してくるファイル *2
exclude         | string       | リモート環境から回収しないファイル  *2

*1 0,1,2のいずれかの値を指定することができる。
0は削除、1は削除しない、2は親ノードと同じ挙動を意味する。
初期値は2だが、rootワークフローは作成時に0に変更する。

*2 include, excludeともにglobパターンを指定することができる。
includeにマッチしなおかつexcludeにマッチしないファイルを回収してくる。
ただし、outputFilesに指定されたファイルは、include/excludeの指定に関わらず全て回収される。

### If
property        | type         | description
----------------|--------------|--------------
name            | string       | ノードを識別するためのlabel
description     | string       | ノードの説明文
previous        | number[]     | 先行ノードのindex
next            | number[]     | 後続ノードのindex
inputFiles      | inputFile[]  | 先行ノードから受け取るファイル
outputFiles     | outputFile[] | 後続ノードへ渡すファイル
condition       | string       | 条件判定を行うスクリプトのファイル名 *1
else            | number[]     | 条件判定が偽だった時の後続ノードのindex

*1 conditionに指定されたスクリプトの終了コードが0の時は真それ以外の時は偽と判定して後続のノードへ遷移する。
conditionに指定された文字列と一致するファイルが存在しなかった時は、Javascriptの式とみなしてそのコードを実行します。

### Workflow
property        | type         | description
----------------|--------------|--------------
name            | string       | ノードを識別するためのlabel
description     | string       | ノードの説明文
previous        | number[]     | 先行ノードのindex
next            | number[]     | 後続ノードのindex
inputFiles      | inputFile[]  | 先行ノードから受け取るファイル
outputFiles     | outputFile[] | 後続ノードへ渡すファイル

### ParameterStudy
property        | type         | description
----------------|--------------|--------------
name            | string       | ノードを識別するためのlabel
description     | string       | ノードの説明文
previous        | number[]     | 先行ノードのindex
next            | number[]     | 後続ノードのindex
inputFiles      | inputFile[]  | 先行ノードから受け取るファイル
outputFiles     | outputFile[] | 後続ノードへ渡すファイル
parameterFile   | string       | パラメータスタディの設定を記述したファイル

### For
property         | type           | description
---------------- | -------------- | --------------
name             | string         | ノードを識別するためのlabel
description      | string         | ノードの説明文
previous         | number[]       | 先行ノードのindex
next             | number[]       | 後続ノードのindex
inputFiles       | inputFile[]    | 先行ノードから受け取るファイル
outputFiles      | outputFile[]   | 後続ノードへ渡すファイル
start            | number         | ループの始値
end              | number         | ループの終値
step             | number         | 1回のループでのインデックスの増分(負値も可)

### While
property         | type           | description
---------------- | -------------- | --------------
name             | string         | ノードを識別するためのlabel
description      | string         | ノードの説明文
previous         | number[]       | 先行ノードのindex
next             | number[]       | 後続ノードのindex
inputFiles       | inputFile[]    | 先行ノードから受け取るファイル
outputFiles      | outputFile[]   | 後続ノードへ渡すファイル
condition        | string         | 条件判定を行うスクリプトのファイル名 *1

*1 設定値の取り扱いはIfと同じ

### Foreach
property         | type           | description
---------------- | -------------- | --------------
name             | string         | ノードを識別するためのlabel
description      | string         | ノードの説明文
previous         | number[]       | 先行ノードのindex
next             | number[]       | 後続ノードのindex
inputFiles       | inputFile[]    | 先行ノードから受け取るファイル
outputFiles      | outputFile[]   | 後続ノードへ渡すファイル
indexList        | string[]       | ループインデックスに指定される値のリスト

## inputFileおよびoutputFile
前章に示したworkflow componentのinputFilesおよびoutputFilesプロパティに格納する
inputFileおよびoutputFileオブジェクトは次のプロパティを持つ

### inputFile
property  | type             | description
----------|------------------|--------------------------------------------
name      | string           | ファイルまたはディレクトリ名
srcNode   | number or string | 送信元ノードのindexまたは'parent'
srcName   | string           | 送信元ノードでのファイルまたはディレクトリ名

### outputFile
property    | type     | description
------------|----------| --------------------------------------------
name        | string   | ファイルまたはディレクトリ名
dst         | string[] | 送信先ノードの配列
dst.dstNode | string   | 送信先ノードのindexまたは'parent'
dst.dstName | string   | 送信先ノードでのファイルまたはディレクトリ名

inputFile/outputFileともに対象ノードとして'parenet'が指定された場合は親ノードとの間でのファイル転送が行なわれる


## ノード間のファイル受け渡し処理について
inputFileおよびoutputFileのnameプロパティには、以下の4種類の文字列を指定することができます。
- 空文字列(inputのみ)
- path.sep('\'でも'/'でも良い)を含む文字列
- path.sep('\'でも'/'でも良い)を含まない文字列
- globパターン(outputのみ)

### inputが空文字列の時
inputは後続ノードのrootディレクトリ(そのノードのpathプロパティが指定されたディレクトリ)が
指定されてものとして扱われます。

### inputがpath.sepを含まない文字列の時
outputが単一のファイルだった時は、inputはファイル名として扱われ別名でのシンボリックリンクが作成されます。

outputがディレクトリだった時は、inputはディレクトリ名として扱われその名前でディレクトリへのシンボリックリンクが作成されます。

outputがglobパターンだった時は、inputはディレクトリ名として扱われ、
そのディレクトリの下にglobパターンで指定されたファイルへのシンボリックリンクが作成されます。

いずれの場合でも、outputの指定文字列にpath.sepが含まれた場合は後続ノード側でも同じディレクトリが作成された上で
シンボリックリンクが作成されます。


### inputがpath.sepを含む文字列の時
最後のpath.sepまでを後続ノードのrootディレクトリからの相対ディレクトリ名として扱います。

先頭と末尾のpath.sepは無視され、それぞれ取り除いた値が指定されたものとして扱います。
例えば'/foo/bar/'という指定がされた時は、'foo/bar'が指定されたものとして扱います。

(もしあれば)末尾のものを除いて最後のpath.sep以降に続く文字列は"inputがpath.sepを含まない文字列の時"に準じて
outputの指定に応じた取り扱いを行ないます。


## プロジェクト実行時の挙動
プロジェクトの実行を開始すると、まずroot workflowがDispatcherクラスに渡されDispatcherクラスは
workflowの子ノードを順次探索して、実行可能な子ノードから順に処理していきます。

子ノードのうちTaskは、hostおよびjobSchedulerの設定に応じて、対応するExecuterクラスに渡され
プログラムの実行、ジョブ投入などの処理が行なわれます。

直接実行されるTaskについては実行後のcall backでstateプロパティが書き換えられます。
また、ジョブとしてバッチシステムに投入されたTaskはsetIntervalを使ったポーリングにより
実行状況が監視され、stateプロパティに反映されます。

dispatcherがWorkflow, ParamterStudy, For, While, Foreachを見つけた時は、
新規にDispatcherクラスを生成し以降の処理をそちらへ移譲します。

### プロジェクトおよび各コンポーネントのstatus表示について
プロジェクトの状態は以下4つのうちいずれかの状態を取ります。

- not-started 
- running
- finished
- failed

初期状態は"not-started"で実行を開始すると"running"に遷移し、実行終了時に1つ以上のコンポーネントがfailedになっていればfailedへ
全てのコンポーネントが正常に終了していれば"finished"へ遷移します。
各コンポーネントのstatusは以下の8種類の状態を取ります。

- not-started
- stage-in   (task only)
- waiting    (task only)
- running    running
- queued     (task only)
- stage-out  (task only)
- finished
- failed

"stage-in"はリモートで実行もしくはリモートでジョブ投入を行なうtaskのみが取る状態で、リモートサーバへ必要なファイルを転送している状態を示します。

"waiting"は同時実行task数の制限により待ち状態となっていることを示します。

"queued"はジョブスケジューラに投入し実行開始を待っている状態を示します。

"stage-out"はリモートサーバでのtaskの実行が終了し必要なファイルを転送している状態を示します。

これらのstatusはジョブスケジューラが返すものとは異なりますので、ステージング方式を使用しているようなシステムへジョブを投入する場合、ジョブスケジューラ上でsta-ge-inやstage-out状態であってもwheelのstatusはququedとなります。逆にwheelのstatus表示がstage-inまたはstage-out状態の時は、ジョブスケジューラ上では投入前もしくは完了後となります。


## JobSchdulerの設定方法
Taskノードは、child\_process又はsshを用いて指定されたスクリプトを直接実行する以外に、ジョブスケジューラにジョブとして投入することもできます。
本機能に関する設定は次の6つがあります。

1. TaskクラスのuseJobSchedulerプロパティ {boolean}
  本プロパティがtrueの時、当該taskはジョブスケジューラ経由で実行されます。

2. Taskクラスのqueueプロパティ {string=null}
  本プロパティには、投入先のキュー名を指定することができます。
  null(デフォルト値)が指定されていた場合はジョブスケジューラ側で指定されているデフォルトキューに対してジョブが投入されます。

3. remotehost設定内のqueueプロパティ {string}
  本プロパティには当該ホストで使用可能なキューの一覧をカンマ区切りの文字列としてエンドユーザが指定することができます。
  本リストはTaskノードのproperty設定画面でエンドユーザに対して設定値の選択肢として呈示されます。
  ジョブ投入時にTaskクラスのqueueプロパティに設定された値が本リスト内に存在しない場合は、リストの先頭要素が指定されたものとして扱います。
  また、本リストが空の場合Taskの設定に関わらず、ジョブスケジューラ側で設定されたデフォルトキューに対してジョブを投入します。

4. remotehost設定内のjobSchedulerプロパティ {string}
  本プロパティには当該ホストから投入可能なジョブスケジューラの名称を指定します。

5. remotehost設定内のnumJobプロパティ {number}
  本プロパティに設定された値以下の投入本数を上限として、wheelからのジョブ投入を抑制します。

6. config/server.json内のqueueプロパティおよびjobSchedulerプロパティ
  node.jsが動作しているマシンからジョブを投入する際の利用可能キューリストおよびジョブスケジューラの名称を指定します。
  内容はそれぞれ3.および4と同様です。

ジョブスケジューラの定義は"app/db/jobSceduler.json"にて行ないます。
スケジューラの名称をkeyとし、以下の各keyを持つテーブルを値として各ジョブスケジューラを列挙します。
なお、全ての値は文字列型とする必要があります。

key             | value
----------------|-----------------------
submit          | ジョブ投入に用いるコマンド名
queueOpt        | 投入先キューを指定するためのsubmitコマンドのオプション
stat            | ジョブの状態表示に用いるコマンド名
del             | ジョブの削除に用いるコマンド名
reJobID         | submitコマンドの出力からジョブIDを抽出するための正規表現
reFinishdState  | statコマンドの出力を正常終了と判定するための正規表現
reFailedState   | statコマンドの出力を異常終了と判定するための正規表現

reJobIDは1つ以上のキャプチャを含む正規表現でなければなりません。また1つ目のキャプチャ文字列がjobIDを示す文字列として扱われます。

reFinishedStateとreFailedStateは、前者が先に評価され前者がマッチした場合は後者の判定は行なわずに正常終了と判定します。また、両者にマッチしない場合はジョブは実行待ちもしくは実行中と判定します。

いずれの正規表現もプログラム内でコンパイルして利用するため、正規表現リテラル(//)は使えないことに留意してください。

parallel naviでの設定は次のようになります。
```
{
  "ParallelNavi": {
    "submit": "pjsub",
    "queueOpt": "-L rscgrp=",
    "stat": "pjstat -H day=3 --choose st,ec",
    "del": "pjdel",
    "reJobID": "pjsub Job (\\\\d+) submitted.",
    "reFinishdState": "^ST *EC\\\\nEXT *0",
    "reFailedState": "^ST *EC\\\\n(CCL|ERR|EXT)"
  }
}
```

## gitによる履歴管理
wheelではgitを用いたファイル履歴の管理を行なっています。
ユーザが行なう操作に対応して以下のコマンドに相当する処理が実行されます。

ユーザ操作                | gitコマンド
--------------------------|---------------
プロジェクト新規作成      | git init
プロジェクトのインポート  | git clone
ファイルのアップロード    | git add
ファイルの新規作成        | git add
編集したファイルの保存    | git add
saveボタンの押下          | git commit
revertボタンの押下        | git reset HEAD --hard
cleanボタンの押下         | git clean -fd



## 画面遷移
![画面遷移図](./screen_transition.svg)

## 各画面で発生するsocket.ioによる通信一覧

全般的な注意事項
- socket.ioの通信はURLと同名のnamespaceを用いる
- 以降の説明において、型の表記はJSDoc形式に準じる

本章で通信に使用するオブジェクトは以下のとおり

### file
| property | data type |  description                                         
|----------|-----------|------------------------------------------------------
| path     | string    | 要求された時のディレクトリパス
| name     | string    | ファイル又はディレクトリ名
| isdir    | boolean   | 送信されるデータがディレクトリかどうかのフラグ
| islink   | boolean   | 送信されるデータがシンボリックリンクかどうかのフラグ


### link
| property | data type |  description                                         
|----------|-----------|------------------------------------------------------
| src      | number    | link元ノードのindex番号
| dst      | number    | link先ノードのindex番号
| isElse   | boolean   | (ifノードの)else側のリンクを示すフラグ


### filelink
| property | data type        |  description                                         
|----------|------------------|------------------------------------------------------
| src      | number or string | link元ノードのindex番号(親とlinkする時は"parent")
| srcName  | string           | link元ノードでのファイル名
| dst      | number or string | link先ノードのindex番号(親とlinkする時は"parent")
| dstName  | string           | link先ノードでのファイル名

### taskState
| property  | data type |  description                                         
|-----------|-----------|------------------------------------------------------
| parent    | string    | taskが所属するworkflow等のパス
| name      | string    | taskの名前
| startTime | string    | 実行開始日時(未実行のものはnull)
| endTime   | string    | 実行完了日時(未完了のものはnull)
| state     | string    | taskの状態

### node
| property | data type |  description                                         
|----------|-----------|------------------------------------------------------
| type     | string    | ノードの種類
| pos      | object    | ノードの表示位置を示すオブジェクト。propertyは次の2つ
| pos.x    | number    | ノードのx座標
| pos.y    | number    | ノードのy座標

### updateNode
| property | data type |  description                                         
|----------|-----------|------------------------------------------------------
| index    | number    | 変更対象ノードのindex
| property | string    | 変更対象のプロパティ名
| value    | *         | 変更後の値。型はpropertyによって異なる
| cmd      | string    | 更新内容を示す文字列<br>update(値の変更)<br>add(配列型プロパティへの値の追加)<br>del(配列型プロパティからの値の削除)のいずれか
       
### hostInfo
| property | data type      |  description                                         
|----------|----------------|------------------------------------------------------
| name     | string         | 設定情報の表示名
| id       | string         | 設定情報につける一意な識別子(サーバ側で新規作成時に付与)
| host     | string         | ホスト名 or IPアドレス
| path     | string         | 接続先での作業ディレクトリ
| username | string         | ユーザ名
| keyFile  | string or null | 公開鍵接続に使う鍵のファイルパス(パスワード接続の時はnull)
| [numJob] | number         | 接続先ホストから同時に投入できる最大ジョブ数
| [queue]  | string         | 接続先ホストからジョブを投入する時に使えるキューの一覧をカンマ区切りで並べたもの。
| [port]   | number         | ssh接続に使うポート番号 (default 22)

### sshTest
| property | data type |  description                                         
|----------|-----------|------------------------------------------------------
| host     | string    | ホスト名 or IPアドレス
| [port]   | number    | ssh接続に使うポート番号 (default 22)
| username | string    | ユーザ名
| keyFile  | string    | 秘密鍵のファイル名、パスワード認証時はfalsyな値を設定すること

### renameProject
| property | data type |  description                                         
|----------|-----------|------------------------------------------------------
| id       | string    | プロジェクトID
| path     | string    | プロジェクトディレクトリのパス
| newName  | string    | 変更後の名前

### renameFile
| property | data type |  description                                         
|----------|-----------|------------------------------------------------------
| path     | string    |  変更対象の親ディレクトリの絶対パス
| oldName  | string    |  変更前の名前
| newName  | string    |  変更後の名前

### downloadFile
| property | data type |  description                                         
|----------|-----------|------------------------------------------------------
| path     | string    | ダウンロード対象の親ディレクトリの絶対パス
| name     | string    | ダウンロード対象ファイ/ディレクトリの名前

### account
| property      | data type |  description                                         
|---------------|-----------|------------------------------------------------------
| name          | string    | ユーザ名
| password      | string    | パスワード
| workDirectory | string    | 当該ユーザの初期ディレクトリ
| uid           | number    | 当該ユーザのuid
| gid           | number    | 当該ユーザのgid


### home画面で発生する通信一覧
| event name               | direction | description                                        | data type     | message
|--------------------------|-----------|----------------------------------------------------|:-------------:|------------------------
| projectList              | s->c      | サーバ側に登録されているプロジェクトの一覧         | object        | project JSONファイルの中身全てにidとpathを追加したもの
| getProjectList           | c->s      | プロジェクトの一覧を要求                           | *             | サーバ側で値は見ていないので、何を送っても良い
| getDirList               | c->s      | プロジェクトの新規作成プロセス開始                 | string        | 表示するディレクトリパス
| getDirListAndProjectJson | c->s      | サーバ上に存在する既存プロジェクトのインポート開始 | string        | 表示するディレクトリパス
| addProject               | c->s      | 新規プロジェクト作成                               | string        | {親ディレクトリの絶対パス}/{プロジェクト名}
| importProject            | c->s      | 既存プロジェクトのインポート                       | string        | {親ディレクトリの絶対パス}/{プロジェクトJsonファイル名}
| removeProject            | c->s      | 既存プロジェクトの削除                             | string        | プロジェクトID 又はProject Jsonファイルの絶対パス
| renameProject            | c->s      | 既存プロジェクトのnameおよびディレクトリ名変更     | renameProject | 
| reorderProject           | c->s      | プロジェクトの表示順変更                           | number[]      | 旧並び順でのindexのリスト(0 origin)
| fileList                 | s->c      | サーバ上のファイル/ディレクトリを受信              | file          | ファイル/ディレクトリの情報<br>一回のリクエストに対して存在するファイル/ディレクトリの数だけ通信が返ってくることに注意
| showMessage              | s->c      | サーバサイドで発生したエラーメッセージを送信       | string        |


## workflow画面で発生する通信一覧
| event name        | direction | description                                   | data type    | message
|-------------------|-----------|-----------------------------------------------|:------------:|------------------------
| getFileList       | c->s      | ファイル/ディレクトリ一覧の送信を要求         | string       | 要求するディレクトリの絶対パス
| fileList          | s->c      | サーバ上のファイル/ディレクトリを受信         | file         | ファイル/ディレクトリの情報。一回のリクエストに対して存在するファイル/ディレクトリの数だけ通信が返ってくることに注意
| getWorkflow       | c->s      | ワークフローの送信を要求                      | string       | 要求するワークフローのJSONファイルの絶対パス
| workflow          | s->c      | 編集対象ワークフローの内容                    | object       | Workflow/ParameterStudy/For/While/ForeachのJSON (workflowComponent.jsを参照のこと)
| removeFile        | c->s      | ファイル/ディレクトリの削除(recursive)        | string       | 削除対象ファイル/ディレクトリのパス
| renameFile        | c->s      | ファイル/ディレクトリ名の変更                 | renameFile   | 変更善後のファイル/ディレクトリ名
| downloadFile      | c->s      | ファイル/ディレクトリのダウンロードを要求     | downloadFile | ダウンロード対象のファイル/ディレクトリ名  *not implimented*
| runProject        | c->s      | プロジェクトの実行開始                        | string       | rootWorkflowのファイル名
| pauseProject      | c->s      | プロジェクト実行の一時停止                    | *            | サーバ側で値は見ていないので、何を送っても良い
| cleanProject      | c->s      | プロジェクトの初期化                          | *            | サーバ側で値は見ていないので、何を送っても良い
| stopProject       | c->s      | プロジェクトの実行停止と初期化                | *            | サーバ側で値は見ていないので、何を送っても良い
| createNode        | c->s      | 新規ノードの作成                              | node         | 新規に作成するノードの情報
| updateNode        | c->s      | ノードのプロパティ更新                        | updateNode   | 対象のノードと更新内容
| removeNode        | c->s      | ノードの削除                                  | number       | 削除対象ノードのindex
| addLink           | c->s      | ノード間の依存関係追加                        | link         | 
| removeLink        | c->s      | ノード間の依存関係削除                        | link         |
| addFileLink       | c->s      | ノード間のファイル依存関係追加                | fileLink     | 
| removeFileLink    | c->s      | ノード間のファイル依存関係削除                | fileLink     |
| projectState      | s->c      | 実行中のprojectの状態を送る                   | string       | projectの状態を表す文字列を返す
| taskStateList     | s->c      | 実行中のtaskの状態を送る                      | taskState[]  | 全Taskのデータが入った単一の配列が送られてくる
| logDBG            | s->c      | サーバサイドの処理中に発生した出力を送信      | string       | デバッグメッセージ
| logINFO           | s->c      | サーバサイドの処理中に発生した出力を送信      | string       | メッセージ
| logWARN           | s->c      | サーバサイドの処理中に発生した出力を送信      | string       | ワーニング
| logERR            | s->c      | サーバサイドの処理中に発生した出力を送信      | string       | エラーメッセージ
| logStdout         | s->c      | サーバサイドの処理中に発生した出力を送信      | string       | ローカルホストで実行されたtaskの標準出力
| logStderr         | s->c      | サーバサイドの処理中に発生した出力を送信      | string       | ローカルホストで実行されたtaskの標準エラー出力
| logSSHout         | s->c      | サーバサイドの処理中に発生した出力を送信      | string       | リモートホストで実行されたtaskの標準出力
| logSSHerr         | s->c      | サーバサイドの処理中に発生した出力を送信      | string       | リモートホストで実行されたtaskの標準エラー出力
| askPassword       | s->c      | パスワードの送信を要求                        | string       | リモートホストのラベル
| password          | c->s      | パスワードを送信                              | string       | askPasswordで要求されたパスワード
| getHostList       | c->s      | ホスト情報一覧のリクエスト                    | *            | サーバ側で値は見ていないので、何を送っても良い
| hostList          | s->c      | ホスト情報の一覧                              | hostInfo[]   | 登録済のremotehost設定の一覧
| getTaskStateList  | c->s      | taskStateListの送信を要求                     | string       | rootWorkflowのファイル名
| getProjectJson    | c->s      | projectJsonの送信を要求                       | string       | projectJsonファイルのファイル名(cookieのprojectの値)
| projectJson       | s->c      | projectJsonを送信                             | projectJson  | project全体のメタデータを記述したJSONを送信
| updateProjectJson | c->s      | projectJsonの更新                             | object       | projectJsonのうち更新するデータのkey:valueペア
| saveProject       | c->s      | projectのsave(commit)を指示                   | null, func   | funcの引数として正常終了時はtrue, 異常終了時はfalseを返す
| revertProject     | c->s      | projectの状態を直前のcommitまで戻すことを指示 | null, func   | funcの引数として正常終了時はtrue, 異常終了時はfalseを返す
| getProjectState   | c->s      | projectStateの送信を要求                      | string       | projectJsonファイルのファイル名(cookieのprojectの値)
| createNewFile     | c->s      | 空ファイルを作成する                          | string, func | 作成するファイル名。 funcの引数として正常終了時はtrue, 異常終了時はfalseを返す
| createNewDir      | c->s      | 空ディレクトリを作成する                      | string, func | 作成するディレクトリ名。 funcの引数として正常終了時はtrue, 異常終了時はfalseを返す


### rapid画面で発生する通信一覧
| event name      | direction | description                                         | data type | message
|-----------------|-----------|-----------------------------------------------------|:---------:|------------------------
| tree            | s->c      | ディレクトリツリー                                  | object    | js-treeが解釈できるJson形式のディレクトリツリー

### remotehost画面で発生する通信一覧
| event name           | direction   | description                                           | data type             | message
|----------------------|-------------|-------------------------------------------------------|:---------------------:|-------------------------
| getHostList          | c->s        | ホスト情報一覧のリクエスト                            | *                     | サーバ側で値は見ていないので、何を送っても良い
| hostList             | s->c        | ホスト情報の一覧                                      | hostInfo[]            |
| addHost              | c->s        | 新規ホストの追加リクエスト                            | hostInfo              | 新規に追加するホストの情報
| updateHost           | c->s        | 既存ホスト情報の修正                                  | hostInfo              | 更新するホストの情報
| removeHost           | c->s        | ホスト情報の削除リクエスト                            | string                | 削除対象ホストid
| getFileList          | c->s        | ファイル/ディレクトリ一覧の送信を要求                 | string                | 要求するディレクトリの絶対パス
| fileList             | s->c        | サーバ上のファイル/ディレクトリを受信                 | file                  | ファイル/ディレクトリの情報<br>一回のリクエストに対して存在するファイル/ディレクトリの数だけ通信が返ってくることに注意
| tryConnectHostById   | c->s        | ssh接続テストの要求                                   | id, pasword, fn       | 登録済ホストのid, パスワード<br>第三引数のfnはテスト結果のboolean値を引数にもつcallback関数)
| tryConnectHost       | c->s        | ssh接続テストの要求                                   | sshTest, password, fn | テスト対象のホスト情報<br>第二引数のfnはテスト結果のboolean値を引数にもつcallback関数)

### admin画面で発生する通信一覧
| event name     | direction | description                                         | data type | message
|----------------|-----------|-----------------------------------------------------|:---------:|------------------------
| accountList    | s->c      | ユーザアカウントの一覧                              | account[] | 
| getAccountList | c->s      | ユーザアカウント一覧の要求                          | *         | サーバ側で値は見ていないので、何を送っても良い
| addAccount     | c->s      | 新規アカウントの追加リクエスト                      | account   | 新規に追加するアカウントの情報
| updateAccount  | c->s      | 既存アカウント情報の修正                            | account   | 更新するアカウントの情報
| removeAccount  | c->s      | アカウント情報の削除リクエスト                      | string    | 削除対象アカウントid

