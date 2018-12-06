#APIガイド
本ドキュメントでは、WHEELのサーバクライアント間で発生するSocket.IOによる通信APIについて述べます。

<!-- vim-markdown-toc GitLab -->

* [全般的な注意事項](#全般的注意事項)
* [home画面で発生する通信(server -> client)](#home画面発生通信server-client)
    * [projectList(project[])](#projectlistproject)
    * [fileList(file[]) [変更あり]](#filelistfile-変更)
    * [showMessage(message)](#showmessagemessage)
* [home画面で発生する通信(client -> server)](#home画面発生通信client-server)
    * [getProjectList(cb)](#getprojectlistcb)
    * [getDirList(path, cb)](#getdirlistpath-cb)
    * [getDirListAndProjectJson(path, cb)](#getdirlistandprojectjsonpath-cb)
    * [addProject(name, description, cb) [変更あり]](#addprojectname-description-cb-変更)
    * [importProject(jsonFilename, newName, description, cb) [変更あり]](#importprojectjsonfilename-newname-description-cb-変更)
    * [removeProject(name, cb)](#removeprojectname-cb)
    * [renameProject(renameProject, cb)](#renameprojectrenameproject-cb)
    * [reorderProject(newOrder, cb) [変更あり]](#reorderprojectneworder-cb-変更)
* [workflow画面で発生する通信一覧(server -> client)](#workflow画面発生通信一覧server-client)
    * [fileList](#filelist)
    * [workflow(component[])](#workflowcomponent)
    * [projectState(status)](#projectstatestatus)
    * [taskStateList(taskState[]) [変更予定、未実施]](#taskstatelisttaskstate-変更予定未実施)
    * [logXXXX(message)](#logxxxxmessage)
    * [askPassword(remoteHost)](#askpasswordremotehost)
    * [hostList(hostInfo[])](#hostlisthostinfo)
    * [projectJson(projectJson)](#projectjsonprojectjson)
* [workflow画面で発生する通信一覧(client -> server)](#workflow画面発生通信一覧client-server)
  * [File操作関連API](#file操作関連api)
    * [getFileList(path, cb)](#getfilelistpath-cb)
    * [getSNDContents(path, name, idDir, cb) [新規作成]](#getsndcontentspath-name-iddir-cb-新規作成)
    * [removeFile(path, cb)](#removefilepath-cb)
    * [renameFile(renameFile, cb) [検討中 引数を増やしてrenameFileの中身をバラバラに渡す]](#renamefilerenamefile-cb-検討中-引数増renamefile中身渡)
    * [downloadFile(path, cb) [新規作成]](#downloadfilepath-cb-新規作成)
    * [createNewFile(filename, cb)](#createnewfilefilename-cb)
    * [createNewDir(dirname, cb)](#createnewdirdirname-cb)
  * [workflow編集API](#workflow編集api)
    * [getWorkflow(path,cb)](#getworkflowpathcb)
    * [createNode(node, cb) [検討中 引数を増やしてnodeデータをバラバラに渡す]](#createnodenode-cb-検討中-引数増node渡)
    * [updateNode(index, property, value, cb) [変更あり]](#updatenodeindex-property-value-cb-変更)
    * [addValueToArrayProperty(index, property, value, cb) [新規作成、未実装]](#addvaluetoarraypropertyindex-property-value-cb-新規作成未実装)
    * [delValueFromArrayProperty(index, property, value, cb) [新規作成、未実装]](#delvaluefromarraypropertyindex-property-value-cb-新規作成未実装)
    * [removeNode(index, cb)](#removenodeindex-cb)
    * [addLink(link, cb) [検討中 引数を増やしてlinkをバラバラに渡す]](#addlinklink-cb-検討中-引数増link渡)
    * [removeLink(link, cb) [検討中 引数を増やしてlinkをバラバラに渡す]](#removelinklink-cb-検討中-引数増link渡)
    * [addInputFile(index, name, cb) [新規作成]](#addinputfileindex-name-cb-新規作成)
    * [addOutputFile(index, name, cb) [新規作成]](#addoutputfileindex-name-cb-新規作成)
    * [removeInputFile(index, name, cb) [新規作成、 未実装]](#removeinputfileindex-name-cb-新規作成-未実装)
    * [removeOutputFile(index, name, cb) [新規作成、 未実装]](#removeoutputfileindex-name-cb-新規作成-未実装)
    * [renameInputFile(index, newName, cb) [新規作成]](#renameinputfileindex-newname-cb-新規作成)
    * [renameOutputFile(index, newName, cb) [新規作成]](#renameoutputfileindex-newname-cb-新規作成)
    * [addFileLink(srcNode, srcName, dstNode, dstName, cb) [変更あり]](#addfilelinksrcnode-srcname-dstnode-dstname-cb-変更)
    * [removeFileLink(srcNode, srcName, dstNode, dstName, cb) [変更あり]](#removefilelinksrcnode-srcname-dstnode-dstname-cb-変更)
    * [getHostList(cb)](#gethostlistcb)
  * [Project実行、編集関連API](#project実行編集関連api)
    * [runProject(path, cb)](#runprojectpath-cb)
    * [pauseProject(cb)](#pauseprojectcb)
    * [cleanProject(cb)](#cleanprojectcb)
    * [stopProject(cb)](#stopprojectcb)
    * [cleanComponent(id, cb) [新規作成、未実装]](#cleancomponentid-cb-新規作成未実装)
    * [password(pw, cb)](#passwordpw-cb)
    * [getTaskStateList(rootWorkflow, cb) [検討中] 引数のrootWorkflowは不要な気がする](#gettaskstatelistrootworkflow-cb-検討中-引数rootworkflow不要気)
    * [getProjectState(projectJsonFile, cb)](#getprojectstateprojectjsonfile-cb)
    * [getProjectJson(projectJsonFile, cb)](#getprojectjsonprojectjsonfile-cb)
    * [updateProjectJson(property, value, cb) [変更あり]](#updateprojectjsonproperty-value-cb-変更)
    * [saveProject(null, cb)](#saveprojectnull-cb)
    * [revertProject(null, cb)](#revertprojectnull-cb)
* [remotehost画面で発生する通信一覧(server -> client)](#remotehost画面発生通信一覧server-client)
    * [hostList(hostInfo[])](#hostlisthostinfo-1)
    * [fileList](#filelist-1)
    * [JobSchedulerList(JobSchduler[]) [新規作成、未実装]](#jobschedulerlistjobschduler-新規作成未実装)
* [remotehost画面で発生する通信一覧(client -> server)](#remotehost画面発生通信一覧client-server)
    * [getHostList(cb)](#gethostlistcb-1)
    * [addHost(hostInfo, cb)](#addhosthostinfo-cb)
    * [updateHost(hostInfo, cb)](#updatehosthostinfo-cb)
    * [removeHost(id, cb)](#removehostid-cb)
    * [getFileList(path, cb)](#getfilelistpath-cb-1)
    * [tryConnectHostById(id, passwrod, cb)](#tryconnecthostbyidid-passwrod-cb)
    * [tryConnectHost(sshTeset, passwod, cb) [検討中、sshTestの各プロパティを複数の引数に分けて渡す]](#tryconnecthostsshteset-passwod-cb-検討中sshtest各複数引数分渡)
* [admin画面で発生する通信一覧(server -> client)](#admin画面発生通信一覧server-client)
    * [accountList(account[])](#accountlistaccount)
* [admin画面で発生する通信一覧(client -> server)](#admin画面発生通信一覧client-server)
    * [getAccountList(cb)](#getaccountlistcb)
    * [addAccount(account, cb)](#addaccountaccount-cb)
    * [updateAccount(account, cb)](#updateaccountaccount-cb)
    * [removeAccount(id, cb)](#removeaccountid-cb)
* [rapid画面で発生する通信一覧(server -> client)](#rapid画面発生通信一覧server-client)
    * [tree(dirTree)](#treedirtree)

<!-- vim-markdown-toc -->

## 全般的な注意事項
WHEEL内で行なわれるSocket.IOの通信は、全てURLと同名のnamespace内で行なわれます。

各APIの説明は、イベント名を仮想的な関数名として記述しています。
したがって、 hoge(foo, bar)は、socket.emit("hoge", foo, bar)を意味します。

以降の説明において "cb" はboolean値をひとつ引数にとるコールバック関数を表します。
APIの要求が正常に処理された場合はtrue, 継続不可能なエラー発生時はfalseを引数としてこの関数を呼び出します。
なお、cb引数は全て省略可能です。

データ形式の記述はJSDocの形式に準じます。したがって"[]"がつくものは、その型のデータが0以上入った配列を意味します。

## home画面で発生する通信(server -> client)
#### projectList(project[])
登録済のプロジェクト一覧を送ります。

projectデータの形式は以下のとおり。

| property       | data type |  description
|----------------|:---------:|------------------------------------------------------
| name           | string    |
| description    | string    |
| state          | string    |
| path           | string    | メタデータファイル(swf.prj.json)の絶対パス
| path\_workflow | string    | ルートワークフロー(define.wf.json)の絶対パス
| ctime          | string    | 作成時刻
| mtime          | string    | 最終更新時刻
| id             | string    | プロジェクト毎に振られた一意なID文字列

#### fileList(file[]) [変更あり]

getDirList APIで要求されたディレクトリ内のコンテンツを返します。

fileデータの形式は以下のとおり。

| property | data type |  description                                         
|----------|:---------:|------------------------------------------------------
| path     | string    | 要求された時のディレクトリパス
| name     | string    | ファイル又はディレクトリ名
| type     | string    | {dir, file, snd, sndd, deadlink}のいずれか。
| islink   | boolean   | 送信されるデータがシンボリックリンクかどうかのフラグ

typeの値の意味は次のとおり

dir: ディレクトリ
file: ファイル
snd: 連番ファイル
sndd: 連番ディレクトリ
deadlink: リンク先の実体が無いシンボリックリンク


#### showMessage(message)
- @param { string } message - エラーメッセージ

サーバサイドで発生したエラーメッセージを送信します。


## home画面で発生する通信(client -> server)
#### getProjectList(cb)
プロジェクト一覧の送信を要求します。
データは、projectList APIを介して送信されてきます。

#### getDirList(path, cb)
- @param { string } path - ディレクトリ一覧を要求するディレクトリ

引数で渡されたディレクトリ内に存在するディレクトリの一覧がfileList APIを介して送信されてきます。

#### getDirListAndProjectJson(path, cb) 
- @param { string } path - ディレクトリ一覧を要求するディレクトリ

getDirListと同様ですが、ディレクトリ一覧に加えて、もし存在すればprojectJsonファイルも送られます。

#### addProject(name, description, cb) [変更あり]
- @param { string } name - {親ディレクトリの絶対パス}/{プロジェクト名}
- @param { string } description - プロジェクトの説明文

新規プロジェクトを作成します。
実際に作成されるディレクトリ名はnameの後にsuffix(.wheel)が付けられます。
descriptionを省略(デフォルト値を使う)場合は、nullを指定してください。

#### importProject(jsonFilename, newName, description, cb) [変更あり]
- @param {string} jsonFilename - {親ディレクトリの絶対パス}/{プロジェクトJsonファイル名}
- @param {string} newName - インポート後のプロジェクト名
- @param {string} description - インポート後のプロジェクト説明文

既存プロジェクトをインポートします。
newName, descriptionともにnullを指定すると、インポート前のJsonファイルに書かれた値が使われます。

#### removeProject(name, cb)
- @param {string} name - プロジェクトID 又はProject Jsonファイルの絶対パス

既存プロジェクトを削除します。

#### renameProject(renameProject, cb)
既存プロジェクトのnameを変更し、プロジェクトルートディレクトリをnameに合わせて変更します。

renameProjectデータの形式は以下のとおり

| property | data type |  description                                         
|----------|:---------:|------------------------------------------------------
| id       | string    | プロジェクトID
| path     | string    | プロジェクトディレクトリのパス
| newName  | string    | 変更後の名前

#### reorderProject(newOrder, cb) [変更あり]
- @param {number []} newOrder - 旧並び順でのindex(0 origin)のリスト

プロジェクトリストを引数に指定された順に並べ変えます。


## workflow画面で発生する通信一覧(server -> client)
#### fileList
home画面の同名のAPIと同じ

#### workflow(component[])
編集対象ワークフローと、その子および孫コンポーネントを送ります。

componentのデータ形式は本ドキュメントには記載しないので、workflowComponent.jsを参照のこと。

#### projectState(status)
実行中のprojectの状態を送ります。

#### taskStateList(taskState[]) [変更予定、未実施]
実行中のtaskの状態を送ります。
送られてくる配列には全てのtaskは含まれておらず、
前回の送信時以降で、更新があった(もしくは新規に作成された)taskのみのデータが入っています。

taskStateのデータ形式は以下のとおり。

| property   | data type |  description                                         
|------------|:---------:|------------------------------------------------------
| index      | string    | task毎に固有のID文字列
| parent     | string    | 親コンポーネントのディレクトリパス
| parentType | string    | 親コンポーネントの種類
| name       | string    | taskの名前
| startTime  | string    | 実行開始日時(未実行のものはnull)
| endTime    | string    | 実行完了日時(未完了のものはnull)
| state      | string    | taskの状態

#### logXXXX(message)
- @param {string} message - ログ出力

サーバサイドの処理中に発生したログ出力を送信します。

実際のイベント名はログのカテゴリ毎に異なる名前になっており、以下の8種類が使われます。
| event name | description
|------------|------------------------------------------------------------
| logDBG     | デバッグメッセージ
| logINFO    | メッセージ
| logWARN    | ワーニング
| logERR     | エラーメッセージ
| logStdout  | ローカルホストで実行されたtaskの標準出力
| logStderr  | ローカルホストで実行されたtaskの標準エラー出力
| logSSHout  | リモートホストで実行されたtaskの標準出力
| logSSHerr  | リモートホストで実行されたtaskの標準エラー出力

#### askPassword(remoteHost)
- @param {string} remoteHost - パスワードを要求するホスト名

リモートホストへアクセスする時に使うパスワード(またはパスフレーズ)の入力を要求します。

#### hostList(hostInfo[])
remotehost設定の一覧を送ります。

hostInfoデータの形式は以下のとおり

| property              | data type      |  description                                         
|-----------------------|:--------------:|------------------------------------------------------
| name                  | string         | 設定情報の表示名
| id                    | string         | 設定情報につける一意な識別子(サーバ側で新規作成時に付与)
| host                  | string         | ホスト名 or IPアドレス
| path                  | string         | 接続先での作業ディレクトリ
| username              | string         | ユーザ名
| keyFile               | string or null | 公開鍵接続に使う鍵のファイルパス(パスワード接続の時はnull)
| [numJob]              | number         | 接続先ホストから同時に投入できる最大ジョブ数
| [queue]               | string         | 接続先ホストからジョブを投入する時に使えるキューの一覧をカンマ区切りで並べたもの。
| [port]                | number         | ssh接続に使うポート番号 (default 22)
| [jobScheduler]        | string         | そのホストで使われているジョブスケジューラの名称
| [renewInterval]       | number         | ssh接続を再接続する間隔(単位は分)
| [renewDelay]          | number         | 再接続時に、切断後に挟む待ち時間(単位は秒)
| [execInterval]        | number         | ジョブ投入、実行時に間に挟む待ち時間(単位は秒)
| [statusCheckInterval] | number         | ジョブ投入後のステータス確認を行う間隔(単位は秒)
| [maxStatusCheckError] | number         | statusCheckに失敗した時に、ジョブ自体をfailedとするしきい値

#### projectJson(projectJson)
project全体のメタデータを記述したJSONを送信

projectJsonデータは、home画面のprojectListAPIで送られる、projectデータからidを除いたもの。


## workflow画面で発生する通信一覧(client -> server)
### File操作関連API
#### getFileList(path, cb)
- @param {string} path - ファイル一覧の送信を要求するディレクトリの絶対パス

指定されたディレクトリ内に存在するファイル、ディレクトリ等の送信を要求します。
データはfileListAPIで送られてきます。

#### getSNDContents(path, name, idDir, cb) [新規作成]
- @param {string} path - 対象となるSerialNumberDataの親ディレクトリ
- @param {string} name - SNDの名前 (= globパターン)
- @param {boolean} isDir - SNDを連番ディレクトリとみなす(true)か連番ファイルとみなす(false)かのフラグ


fileList APIで送られてきたSND(SerialNumberData)に含まれるファイル名の一覧の送信を要求します。
データはfileListAPIで送られてきます。

#### removeFile(path, cb)
- @param {string} path -削除対象ファイル/ディレクトリのパス

ファイルまたはディレクトリの削除を要求します。

#### renameFile(renameFile, cb) [検討中 引数を増やしてrenameFileの中身をバラバラに渡す]
ファイル又はディレクトリ名の変更を要求します。

renameFileデータの形式は以下のとおり

| property | data type |  description                                         
|----------|:---------:|------------------------------------------------------
| path     | string    |  変更対象の親ディレクトリの絶対パス
| oldName  | string    |  変更前の名前
| newName  | string    |  変更後の名前


#### downloadFile(path, cb) [新規作成]
- @param {string} path - ダウンロードするファイルの絶対パス

ファイルの送信を要求します。

#### createNewFile(filename, cb)
- @param {string} filename - 新規に作成するファイルの絶対パス

空ファイルを作成する

#### createNewDir(dirname, cb)
- @param {string} dirname - 新規に作成するディレクトリの絶対パス

空ディレクトリを作成する


### workflow編集API
#### getWorkflow(path,cb)
- @param {string} path - ワークフロー(又はPS, for等)のJSONファイルの絶対パス

指定されたワークフローデータおよびその子、孫コンポーネントの送信を要求します。
データはworkflowコンポーネントで送られてきます。

#### createNode(node, cb) [検討中 引数を増やしてnodeデータをバラバラに渡す]
新規ノードを作成します。

nodeデータの形式は以下のとおり

| property | data type |  description                                         
|----------|-----------|------------------------------------------------------
| type     | string    | ノードの種類
| pos      | object    | ノードの表示位置を示すオブジェクト。propertyは次の2つ
| pos.x    | number    | ノードのx座標
| pos.y    | number    | ノードのy座標

#### updateNode(index, property, value, cb) [変更あり]
- @param {string} index - 変更対象ノードのindex
- @param {string} property - 変更するプロパティ
- @param {string} value -    変更後の値

既存ノードのプロパティを更新する汎用APIです。

#### addValueToArrayProperty(index, property, value, cb) [新規作成、未実装]
- @param {string} index - 変更対象ノードのindex
- @param {string} property - 変更するプロパティ
- @param {string} value -    追加する値

既存ノードの配列型プロパティに新規のエントリを追加します。
なお、inputFiles, outputFilesは専用APIがあるので、現状ではforEachコンポーネントのindexListプロパティのみに使われます。

TODO indexListの更新はupdateNodeでも可能なので、特に問題が無ければ本APIとdelValueFrom... APIは削除する

#### delValueFromArrayProperty(index, property, value, cb) [新規作成、未実装]
- @param {string} index - 変更対象ノードのindex
- @param {string} property - 変更するプロパティ
- @param {string} value -    削除する値

既存ノードの配列型プロパティからエントリを削除します。

#### removeNode(index, cb)
- @param {string} index - 削除するノードのindex

既存のノードを削除します。

#### addLink(link, cb) [検討中 引数を増やしてlinkをバラバラに渡す]
ノード間の依存関係を追加します。

linkデータの形式は以下のとおり
なお、src, dstのインデックスは形式が変更される予定

| property | data type |  description                                         
|----------|-----------|------------------------------------------------------
| src      | number    | link元ノードのindex番号
| dst      | number    | link先ノードのindex番号
| isElse   | boolean   | (ifノードの)else側のリンクを示すフラグ

#### removeLink(link, cb) [検討中 引数を増やしてlinkをバラバラに渡す]
ノード間の依存関係削除

linkデータの形式はaddLink APIと同じ

#### addInputFile(index, name, cb) [新規作成]
- @param {string} index - inputFileエントリを追加するノードのインデックス
- @param {string} name - inputFileの名前

未接続のinputFileを指定されたノードに追加します。

#### addOutputFile(index, name, cb) [新規作成]
- @param {string} index - outputFileエントリを追加するノードのインデックス
- @param {string} name - outputFileの名前

未接続のoutputFileを指定されたノードに追加します。

#### removeInputFile(index, name, cb) [新規作成、 未実装]
- @param {string} index - inputFileエントリを削除するノードのインデックス
- @param {string} name - inputFileの名前

指定された名前のinputFileを削除します。同時にそのinputFileに接続されていたfileLinkも全て削除します。

#### removeOutputFile(index, name, cb) [新規作成、 未実装]
- @param {string} index - outputFileエントリを削除するノードのインデックス
- @param {string} name - outputFileの名前

指定された名前のoutputFileを削除します。同時にそのoutputFileに接続されていたfileLinkも全て削除します。

#### renameInputFile(index, newName, cb) [新規作成]
- @param {string} index - inputFileの名前を変更するノードのインデックス
- @param {string} newName - 変更後のの名前

指定されたinputFileエントリの名前を変更します。

#### renameOutputFile(index, newName, cb) [新規作成]
- @param {string} index - outputFileの名前を変更するノードのインデックス
- @param {string} newName - 変更後の名前

指定されたoutputFileエントリの名前を変更します。


#### addFileLink(srcNode, srcName, dstNode, dstName, cb) [変更あり]
- @param {string} srcNode - 送信ノードのID
- @param {string} srcName - 送信ノードでの名前
- @param {string} dstNode - 受取ノードのID
- @param {string} dstName - 受取ノードでの名前

ファイル間の依存関係を追加します。
親階層とのファイル依存関係であれば、srcNode, dstNodeにはIDの代わりに"parent"という文字列を指定することもできます。


#### removeFileLink(srcNode, srcName, dstNode, dstName, cb) [変更あり]
- @param {string} srcNode - 送信ノードのID
- @param {string} srcName - 送信ノードでの名前
- @param {string} dstNode - 受取ノードのID
- @param {string} dstName - 受取ノードでの名前

ファイル間の依存関係を削除します。
親階層とのファイル依存関係であれば、srcNode, dstNodeにはIDの代わりに"parent"という文字列を指定することもできます。

#### getHostList(cb)
ホスト情報一覧をリクエストします。

### Project実行、編集関連API
#### runProject(path, cb)
- @param {string} path - 実行するプロジェクトのrootディレクトリの絶対パス

プロジェクトの実行を開始します。

#### pauseProject(cb)
プロジェクトの実行を一時停止します。

#### cleanProject(cb)
プロジェクトを実行開始前の状態に戻します。

#### stopProject(cb)
実行中のプロジェクトを停止し、実行開始前の状態に戻します。

#### cleanComponent(id, cb) [新規作成、未実装]
@param {string} id - コンポーネントのID

指定されたコンポーネントおよびその子孫コンポーネントの状態をgitリポジトリ内のHEADの状態に戻し
statusをnot-startedにします。

#### password(pw, cb)
- @param {string} pw - パスワード

askPassword APIで要求されたパスワードを送信します。

#### getTaskStateList(rootWorkflow, cb) [検討中] 引数のrootWorkflowは不要な気がする
- @param {string} rootWorkflow - rootWorkflowのファイル名

taskStateListの送信を要求します。

#### getProjectState(projectJsonFile, cb)
- @param {string} projectJsonFile - projectJsonファイルのファイル名(cookieのprojectの値)

projectStateの送信を要求


#### getProjectJson(projectJsonFile, cb)
- @param {string} projectJsonFile - projectJsonファイルのファイル名(cookieのprojectの値)

projectJsonの送信を要求

#### updateProjectJson(property, value, cb) [変更あり]
- @param {string} property - projectJsonのうち更新するデータのプロパティ
- @param {string} value    - projectJsonのうち更新するデータの値

projectJsonを更新する

#### saveProject(null, cb)
projectをsave(commit)する

#### revertProject(null, cb)
projectの状態を直前のcommitまで戻す




## remotehost画面で発生する通信一覧(server -> client)
#### hostList(hostInfo[])
workflow画面の同名のAPIと同じ

#### fileList
home画面の同名のAPIと同じ

#### JobSchedulerList(JobSchduler[]) [新規作成、未実装]
wheelが対応しているジョブスケジューラのリストを送る

JobSchdulerのデータ形式は以下のとおり

| property | data type |  description                                         
|----------|-----------|------------------------------------------------------
| name     | string    | ジョブスケジューラの設定名
| queues   | string[]  | 対応しているキューの一覧


## remotehost画面で発生する通信一覧(client -> server)
#### getHostList(cb)
hotsListの送信を要求します。

#### addHost(hostInfo, cb)
新規リモートホスト設定を追加します

#### updateHost(hostInfo, cb)
既存のリモートホスト設定を上書きします。

#### removeHost(id, cb)
指定されたリモートホスト設定を削除します

#### getFileList(path, cb)
workflow画面の同名のAPIと同じ

#### tryConnectHostById(id, passwrod, cb)
@param {string} id  - テスト対象リモートホスト設定のID

@param {string} passwod - パスワードまたは公開鍵のパスフレーズ

ssh接続のテストを行います。

#### tryConnectHost(sshTeset, passwod, cb) [検討中、sshTestの各プロパティを複数の引数に分けて渡す]
@param {sshTest} sshTest - テスト対象ホストの情報

@param {string} passwod - パスワードまたは公開鍵のパスフレーズ

ssh接続のテストを行います。

sshTestのデータ形式は以下のとおり

| property | data type |  description                                         
|----------|-----------|------------------------------------------------------
| host     | string    | ホスト名 or IPアドレス
| [port]   | number    | ssh接続に使うポート番号 (default 22)
| username | string    | ユーザ名
| keyFile  | string    | 秘密鍵のファイル名、パスワード認証時はfalsyな値を設定すること

## admin画面で発生する通信一覧(server -> client)
#### accountList(account[])
ユーザアカウントの一覧を送信します。

accoutデータの形式は以下のとおり

| property      | data type |  description                                         
|---------------|-----------|------------------------------------------------------
| name          | string    | ユーザ名
| password      | string    | パスワード
| workDirectory | string    | 当該ユーザの初期ディレクトリ
| uid           | number    | 当該ユーザのuid
| gid           | number    | 当該ユーザのgid

## admin画面で発生する通信一覧(client -> server)
#### getAccountList(cb)
accountListの送信を要求します

#### addAccount(account, cb)
新規アカウントを作成します。
accountデータの形式はaccountList APIを参照のこと

#### updateAccount(account, cb)
既存のアカウント情報を上書きします。
accountデータの形式はaccountList APIを参照のこと

#### removeAccount(id, cb)
@param {string} id - 削除するアカウントのid文字列

既存のアカウントを削除します。
id引数はアカウントのユーザ名ではなく、識別用に新規作成時にサーバ側で割り当てるID文字列

## rapid画面で発生する通信一覧(server -> client)
#### tree(dirTree)
@param {object} dirTree - js-treeが解釈できるJson形式のディレクトリツリー

ファイルベースのパラスタ用にディレクトリツリーを表示するための情報を送ります。

