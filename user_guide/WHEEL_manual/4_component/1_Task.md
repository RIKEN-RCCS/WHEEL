# Task

![img](./img/task/task.png "task")  

Taskコンポーネントは、WHEELの用意するコンポーネントの中で最も基本的かつ重要なコンポーネントです。    
remotehostおよびjobSchedulerの設定に応じてスクリプトの実行、ジョブ投入などの処理が行われます。  

Taskコンポーネントのプロパティは以下です。

| プロパティ | 入力値 | プロパティ説明 |
|----|----|----|
| name | 文字列 | コンポーネントのディレクトリ名 |
| description | 文字列 | コンポーネントの説明文 | 
| inputFiles | ファイルまたはディレクトリ名 | 先行コンポーネントから受け取るファイル | 
| outputFiles | ファイル, ディレクトリ名またはglobパターン | 後続コンポーネントへ渡すファイル | 
| script | セレクトボックス | Task内の処理を記述したスクリプトのファイルを指定する<br>scriptの選択肢はFilesエリアに登録されているファイル *1| 
| host | セレクトボックス | Taskを実行するhost、localhostまたは登録済のremotehostのlabelを指定する | 
| useJobScheduler | チェックボックス | scriptをバッチスケジューラ経由で実行するか直接実行するかのフラグ | 
| queue | セレクトボックス | ジョブの投入先キューを指定する(useJobSchedulerを使用しない場合は使われない) | 
| clean up flag | ラジオボタン | リモート環境に作成した一時ファイルの取り扱い指定フラグ | 
|  | clean up | 削除する | 
|  | keep files | 削除しない | 
|  | follow parent setting | 親コンポーネントと同じ挙動をする | 
| include | ファイル名 | リモート環境から回収してくるファイル *2 | 
| exclude | ファイル名 | リモート環境から回収しないファイル *2 | 
| state clean | ボタン | コンポーネントの進行状態を初期状態に戻す *3 | 

*1 scriptに指定されたスクリプトの終了コードが0の場合は真と判定し、後続のノードへ遷移します。  
　それ以外の場合は、偽と判定しプロジェクトの実行を停止します。（プロジェクトの判定はfailedとなります。）  
　ただし、paramterStudyコンポーネントで実行するTaskのみ、後続ノードは継続実行されます。  
*2 include, excludeともにglobパターンを指定することができます。  
　includeにマッチしなおかつexcludeにマッチしないファイルを回収してくることができます。  
　ただし、outputFilesに指定されたファイルは、include/excludeの指定に関わらず全て回収されます。  
*3 コンポーネントの進行状態が"finished"もしくは"failed"の時のみ表示されます。

 ***

