# BulkjobTask

![img](./img/bulkjobTask/bulkjobTask.png)  

bulkjobTaskコンポーネントは、ジョブスケジューラ「FUJITSU Software Technical Computing Suite（TCS）」のバルクジョブ機能に基づいた機能です。  
ユーザがバルクジョブを使用できるリモートマシンのアカウントを持つ場合にのみ使用できます。  
本機能は、bulkjobTaskコンポーネントを使用します。  
TCSのバルクジョブ機能に基づきbulkjobTaskコンポーネントに設定されたバルク番号、インプットファイルを用いてジョブ投入されます。  
バルクジョブは、一度のジョブの投入時で複数のサブジョブを投入することができるため、ジョブの充填率を挙げることが可能です。
バルクジョブ機能の詳細に関しては、ジョブスケジューラ「FUJITSU Software Technical Computing Suite（TCS）」のドキュメントをご確認ください。  

bulkjobTaskコンポーネントのプロパティは以下です。

#### ■ bulkjobTask

| プロパティ | 入力値 | プロパティ説明 |
|----|----|----|
| name | 文字列 | コンポーネント名 |
| description | 文字列 | コンポーネントの説明文 |
| script | ファイル | Task内の処理を記述したスクリプトのファイルを指定 *1<br>scriptにはFilesエリアに登録されているファイルが選択可能 |
| inputFiles | ファイルまたはディレクトリ名 | 先行コンポーネントから受け取るファイル |
| outputFiles | ファイル, ディレクトリ名またはglobパターン | 後続コンポーネントへ渡すファイル |
| useJobscheduler | チェックボックス | 依存関係式を使用する |
| manual/usePSSettingFile | ラジオボタン | バルク番号を手動入力するかパラメータセッティングファイルを使用するか |
| start | 数値 | 開始バルク番号、manualのときのみ設定可能 |
| end | 数値 | 終了バルク番号、manualのときのみ設定可能 |
| parameterfile | ファイル | パラメータセッティングファイル、usePSSettingFileのときのみ設定可能 |
| manualFinishCondition | チェックボックス | コンポーネントの終了状態判定にスクリプト(または、javascriptの式)を使用するか *2 |
| condition | ファイル名,またはJavascriptの式 | 条件判定を行うスクリプトのファイル名、またはJavascriptの式 *3 |
| clean up flag | ラジオボタン | リモート環境に作成した一時ファイルの取り扱い指定フラグ |
|  | clean up | 削除する |
|  | keep files | 削除しない |
|  | follow parent setting | 親コンポーネントと同じ挙動をする |
| include | ファイル | リモート環境から回収してくるファイル *4 |
| exclude | ファイル | リモート環境から回収しないファイル *4 |
| state clean | ボタン | コンポーネントの進行状態を初期状態に戻す *5 |

*1 scriptに指定されたスクリプトの終了コードが0の場合は真、  
　それ以外の場合は、偽と判定し(プロジェクトの判定はfailedとなります)後続のノードへ遷移します。  
*2 有効にしない場合、全サブジョブのジョブスクリプト終了コードが0以外の場合、偽、それ以外の場合、真と判定します。
*3 conditionに指定されたスクリプトの終了コードが0の場合は真、それ以外の場合は、偽と判定してコンポーネントの終了状態を決定します。  
　ただし、conditionに指定された文字列と一致するファイルが存在しなかった場合は、Javascriptの式とみなしてそのコードを実行します。  
　この場合、実行結果がtruthyな値の場合を真、falseyな値の場合を偽とします。  
　真のとき、コンポーネントの実行結果をfinish、偽のときfailedと判定します。  
*4 include, excludeともにglobパターンを指定することができます。  
　includeにマッチしなおかつexcludeにマッチしないファイルを回収してくることができます。  
　ただし、outputFilesに指定されたファイルは、include/excludeの指定に関わらず全て回収されます。  
*5 コンポーネントの進行状態が"finished"もしくは"failed"の時のみ表示されます。

# リモートホスト/ジョブスケジューラの設定
## リモートホストの設定
前述にもあるように、bulkjobTaskコンポーネントを使用する場合、  
ユーザがリモートホストのバルク機能を使用する権限を有している必要があります。  
権限を有している場合、リモートホスト設定画面においてbulkjobTaskコンポーネントで使用するリモートホストのbulkjobプロパティを  
有効にすることで使用可能になります。(加えてjobScheduler.jsonファイルにも設定が必要です。詳細後述。)

> リモートホスト画面  
![img](./img/bulkjobTask/bulkjobTask_remotehost.png "remotehost")

## ジョブスケジューラの設定
bulkjobTaskコンポーネントを使用する場合、リモートホストの設定に加えて使用するジョブスケジューラの設定も必要です。    
WHEELモジュール内のapp/config/jobscheduler.jsonファイルにステップジョブ機能を有効にする以下の記述を追記してください。  

> app/config/jobscheduler.jsonへの追記例  
![img](./img/bulkjobTask/bulkjobTask_jobscheduler.png "remotehost")
