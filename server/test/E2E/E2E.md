# E2E
## はじめに
本ドキュメントは、npm run E2Eコマンド（以下、「E2Eコマンド」）で実行されるE2E（End to End）テスト　　
の実施方法、及び注意点について説明します。

## Google Chromeへの自己証明書の登録
E2Eを実行するにあたりGoogle ChromeへWHEELの自己証明書を登録します。  
以下に、MacOSでの設定方法を示します。  
1. Google Chromeヘッダー部右の「Google Chromeの設定」から「設定」を開く
1. プライバシーとセキュリティ「証明書の管理」を開く
1. キーチェーン「ログイン」、分類「証明書」で表示されるエリアにWHEELの自己証明書をドラッグアンドドロップする(localhostで登録されます)
1. localhostの設定を開き、SSLを「常に信頼」に変更する  
以上です。
## 前処理
本テストを実施するにあたり以下の前処理が必要です。  
1.ホームディレクトリへの「E2ETestDir」の配置  
本テストでは、手動にて配置した「E2ETestDir」を対象にプロジェクトの作成およびプロジェクトのインポートを実行します。  
「test/E2E/E2ETestDir.tar.gz」を解凍し、ホームディレクトリへ配置してください。  

2.projectList.json, remotehost.jsonの退避  
本テスト実行時には、E2Eテストの対象とならないように前処理としてを「app/db/projectList.json, remotehost.json」  
projectList_temp.json, remotehost_temp.jsonへと変更し、終了後に元に戻す処理を実装しています。  
ただし、E2Eテストが不正に終了、または、強制終了された場合、前処理後処理が正しく行われずファイルが消失してしまうことが  
ありますので、事前に手動にて退避してください。

3.execPrjDirへのプロジェクトの配置  
任意のプロジェクトの実行及び結果の確認を行う際は、execPrjDirへ保存します。  
execPrjDirに保存されたプロジェクトは、「test/E2E/execProject.js」によって実行され、  
結果がfinishedになるか判定します。  
ただし、プロジェクトの実行可能時間（デフォルト）は、60秒です。  
60秒以上の実行時間が予想されるプロジェクトに関しては、プロジェクト実行前に  
「test/E2E/wdio.conf.js」内のmochaOpts:{timeout}を変更してください。（単位はミリ秒）

4.Taskコンポーネントの実行
Taskコンポーネントに設定したスクリプトファイルの実行場所として、  
WHEELモジュールに含まれるtestServerを使用します。
本E2Eテストは、testServerを起動後、実行してください。

## その他注意点
1.画面解像度に関して
本テストは、2019年1月時点もっともシェア率の大きい「1920×1080」を対象に設計しています。  
本テストをこの解像度に満たない環境にて実施する場合、HTML要素の探索エラー等が生じる可能性がありますので注意してください。  

2.execPrjDirに配置したプロジェクトに関して
execPrjDirに配置したプロジェクトは、「test/E2E/deleteTestProject.js」にて削除されます。  
配置する場合は、コピーしたプロジェクトを保存するようにしてください。