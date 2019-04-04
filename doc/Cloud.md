# クラウドインスタンス 利用機能
## はじめに
本ドキュメントでは、2019年2月にWHEELへ実装されたクラウドインスタンス利用機能の仕様と、利用方法について解説します。
本ドキュメントの内容はα版のものですので、随時変更される可能性があります。

## クラウドインスタンス利用機能の概要
本機能を使用すると、WHEELがプロジェクト実行時にクラウド(現時点ではAWSのみ)上に、Linuxのクラスタ環境を作成し、リモートホストとしてその環境を利用してtaskおよびジョブを実行します。
作成されたインスタンスはプロジェクトの実行終了時にWHEELが自動的に削除します。

## クラウドインスタンス利用機能の使用方法
クラウドインスタンスを利用した計算を行うためには、以下の3点の設定を行う必要があります。

1. remotehost設定
2. taskの設定

### remotehost設定は、以下の内容をapp/db/remotehost.jsonに追記することで行ないます。

```
{
  "name": "aws-test",
  "type": "aws",
  "os": "ubuntu16",
  "region": "ap-northeast-1",
  "numNodes": 2,
  "InstanceType": "t2.micro",
  "rootVolume": 30,
  "shareStorage": true,
  "playbook": "not used for now",
  "mpi": "not used for now",
  "compiler": "not used for now",
  "additionalParams": {
    "id": "XXXX",
    "pw": "XXXX"
  },
  "additionalParamsForHead": {},
  "id": "set unique id string. do not write id for aws",
  "numJob": 1,
  "queue": "",
  "port": 22,
  "jobScheduler": "PBSPro",
  "renewInterval": 0,
  "renewDelay": 0,
  "statusCheckInterval": 10,
  "maxStatusCheckError": 10
}
```

wheelの実行中にremotehost.jsonを編集した後は必ずwheelを再起動してください。
再起動するまで内容が読み込まれないだけでなく、元の設定内容で上書きされる可能性があります。

remotehost.jsonの各プロパティに記載する内容は以下のとおりです。

```
name: 識別するための任意の文字列。taskコンポーネントのプロパティ画面での表示に使われます。
type: "aws" 固定値
os: "ubuntu16" 固定値
region: インスタンスを起動するリージョンを指定します。
numNodes {Number} : 起動するノード数を指定します。
InstanceType: 起動するインスタンスタイプを指定します。
rootVolume {Number} : 起動するインスタンスにアタッチするrootのEBSボリュームの値を指定します。
shareStorage {bool} : headNodeのローカルストレージをNFSで共有する(true)か共有しない(false)かの指定を行ないます。
additionalParams {Object}: aws-sdkのEC2.runInstancesに渡すことのできる設定をこのプロパティに追加することができます。
なお、このプロパティでregionやInstanceTypeを指定しても、前述のregionおよびInstanceTypeの値で上書きされます。
additionalParamsForHead: additionalParamsと同様ですがヘッドノードのみに適用する値を指定します。
```

playbook, mpi, compilerの各プロパティには将来的には設定を記述することができるようになる予定ですが、現時点では使用できません。


### taskの設定
ワークフローエディタでtaskコンポーネントのプロパティ画面を表示し、remotehost設定から前項で追加した設定を選んでください。


## 認証情報について
AWS起動時の認証に使う、access keyおよび secret access keyは前項の例のようにadditionalParamsプロパティに含めて指定することもできますが、node.jsを起動するユーザの環境変数や、shared credential fileを用いて設定することもできます。
また、additionalParamsのid, pwが設定されていない時はプロジェクトの実行開始時にaccess keyおよびsecret access keyの入力を
うながすダイアログが表示されます。
したがって、shared credentialや環境変数を使う場合は、idおよびpwを定義して""の値を入力し、実行時に毎回access key, secret access keyを入力する場合はid, pwを定義しないでおいてください。

Shared Credentials Fileの記述方法などは、以下のURLに記載があります。

https://docs.aws.amazon.com/ja_jp/sdk-for-javascript/v2/developer-guide/loading-node-credentials-shared.html

## 起動されるクラスタの構成
- クラスタ内には外部からsshの公開鍵認証でアクセス可能なhead nodeが1ノードのみ存在します。
- numNodesで2以上を指定した場合は、そこから1(head nodeの分)を引いた数のchild nodeがprivate network内に作成されます。
- private network内の各インスタンスはホストベース認証により相互にsshでアクセスすることができます。
- head node, child nodeともに外部へのアクセスとその戻りの通信は許可されています。
- head nodeにはansibleがインストールされており、デフォルトのインベントリファイルには全ノードが指定されています。
- インベントリは2グループに分かれており、head nodeは "head" グループ、child nodeは "child"グループに含まれています。
- shareStorageがtrueの時は、head nodeのホームディレクトリがNFSv4でchild nodeと共有されています。

```
            +------ private network --------+
            |                 +-------+     |
 internet   |             +---| node0 |     |
            |             |   +-------+     |
          +-----------+   |   +-------+     |
          | head node |---|---| node1 |     |
          +-----------+   |   +-------+     |
            |             |   +-------+     |
            |             +---| node2 |     |
            |             .   +-------+     |
            |             .                 |
            |             .                 |
            |             .                 |
            +-------------------------------+
```

AWSでは、起動されたEC2インスタンスにAmazonEC2FullAccessおよび、AmazonEC2RoleforSSM Roleが設定されており、
system managerからログインして起動中のインスタンスをモニタリングすることも可能です。

認証に使う鍵ペアはAWS側で作成しており、秘密鍵はWHEELのメモリ内に保持されます。
この鍵を取り出して、sshでインスタンスへアクセスすることは、通常の手段ではできませんので
起動中のインスタンスへアクセスする必要がある場合は、system managerの機能をお使いください。



