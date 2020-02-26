# Parameter Study

![img](./img/parameterstudy/PS.png "Parameter Study")  

ParameterStudyコンポーネントは、parameter setting fileプロパティに設定されたファイルを読み込み、そのファイルに指定されたパラメータ展開を行います。  
ループ系コンポーネントと同様にディレクトリのコピーを作成します。（ループ系コンポーネントについては後述参照）  
ループ系コンポーネントとは異なり、コピーされた各ディレクトリの処理は並行して行われます。  

ParameterStudyコンポーネントのプロパティは以下です。

| プロパティ | 入力値 | プロパティ説明 |
|----|----|----|
| name | 文字列 |  コンポーネントのディレクトリ名 |
| description | 文字列 | コンポーネントの説明文 | 
| inputFiles | ファイルまたはディレクトリ名 | 先行コンポーネントから受け取るファイル | 
| outputFiles | ファイル, ディレクトリ名またはglobパターン | 後続コンポーネントへ渡すファイル | 
| parameter setting file | ファイル名 | パラメータスタディの設定を記述したファイル | 
| state clean | ボタン | コンポーネントの進行状態を初期状態に戻す *1 | 

*1 コンポーネントの進行状態が"finished"もしくは"failed"の時のみ表示されます。


# Parameter Study コンポーネントの使用例  

Parameter Study コンポーネントは、パラメトリックスタディ用のコンポーネントです。（以下、Parameter StudyはPSと称します）  
WHEELのPS用ファイル編集機能によりインプットデータにパラメータ設定を行うことで、簡単にPSを実施することができます。  
以下に、サンプルを用いてPSワークフローの設定方法を示します。  

また、本章では、ソルバーの例として、ある空間に位置する3点の座標値からなる三角形の面積を導出するプログラム（面積算出ソルバー:wheel_tutorial_solver.cc）を用います。


## ■ PS ワークフロー 構成図 

コンポーネント内に配置しているコンポーネント（子コンポーネント）は、親コンポーネントにアイコンとして表示されます。

![img](./img/parameterstudy/PS_workflow.png "PS_workflow")  

## ■ PSワークフロー　子階層　構成図

![img](./img/parameterstudy/PS_child_workflow.png "PS_child_workflow") 

## ■  ワークフローを構成するコンポーネント

| コンポーネントタイプ | コンポーネント名 | 入力ファイル | 出力ファイル | 設定ファイル | 備考 |
|----|----|----|----|----|----|
| Parameter Study | samplePS | ー | ー | パラメータスタディの設定を記述したファイル | パラメータ化するファイルを用意 | 
| Task | moveFileTask | ー | ー | パラメータ化により値が変更された入力データをcalcTaskへ移動するスクリプト | PSコンポーネント内に配置（PS子階層） | 
|  | calcTask | ー | ー | ソルバー実行スクリプト * | PSコンポーネント内に配置（PS子階層） | 

*　面積算出ソルバー 

## ■ 各コンポーネントのプロパティ

> samplePS （PSコンポーネント）

| プロパティ名 | 設定値 |
| ---- | ---- |
| Name | samplePS |
| InputFiles | - |
| OutputFiles | - |
| Parameter setting file | parameterSetting.json*1 |  
| Files | inputData.txt, parameterSetting.json |
*1 inputdata.txtのパラメータ化したデータの情報をもつJSONファイル、詳細は後述  

#### ・ inputData.txt

```
0, 0, 0
0, {{ hoge }}, 0
10, 0, 0
```

#### ・ parameterSetting.json

```
{
    "version": 2,
    "targetFiles": [
        {
            "targetName": "inputData.txt",
            "targetNode": "daaecfc0-26bf-11ea-85b6-b15713548352"
        }
    ],
    "params": [
        {
            "keyword": "10",
            "min": 6,
            "max": 10,
            "step": 1
        }
    ],
    "scatter": [],
    "gather": []
}
```

※ "targetNode"の値ははWHEELが一意に設定します

> moveFileTask（Taskコンポーネント）  

| プロパティ名 | 設定値 |
| ---- | ---- |
| Name | moveFileTask |
| Script | moveFiles.sh |
| InputFiles | - |
| OutputFiles | - |
| Remotehost | localhost *2 |  
| Files | moveFiles.sh |  

*2 本タスクは、ローカルマシンでの実行のため、その他プロパティ（UseJobScheduler以下）の設定は行いません。(本章内他のTaskコンポーネントも同様)  

#### ・ moveFiles.sh
```
#!/bin/bash  
mv ../inputData.txt ../calcTask  
```

> calcTask（Taskコンポーネント）

| プロパティ名 | 設定値 |
| ---- | ---- |
| Name | calcTask |
| Script | calc.sh |
| InputFiles | - |
| OutputFiles | - |
| Remotehost | localhost |
| Files | calc.sh, wheel_tutorial_solver.cc, inputdata.txt *3 |  

*3 inputdata.txtは、moveFileTask実行後にPSディレクトリより移動されるファイルです。

#### ・ calc.sh  
```
#!/bin/bash 
g++ wheel_tutorial_solver.cc -o wheel_tutorial_solver  
./wheel_tutorial_solver  
```

## ■ PS用ファイル編集画面

![img](./img/parameterstudy/edit.png "edit") 

入力データにパラメータ設定を行う場合、プロパティ画面[ Files ]エリアよりファイル編集を行います。  
手順は以下です。

1. PSコンポーネントにパラメータ設定を行う入力データファイルをインポート、または作成する
1. 準備したファイルをクリックする
1. [ Files ]領域内の上記Files領域図ボタンをクリックする

上記操作により、PS用ファイル編集画面が表示されます。

#### PS用ファイル編集画面

![img](./img/parameterstudy/edit_for_PS.png "edit_for_PS")  

PS用ファイル編集画面でのパラメータ設定手順は以下です。  
次の手順では、上記図 {{ hoge }}を「6から10」まで変化させる場合の設定を示しています。  

1. 「＋Add New」をクリックする
1. パラメータを変化させるtargetFileを設定する（今回はinputdata.txt）
1. パラメータ化する部分を範囲選択する
1. 「Parameters」に選択した部分が正しく表示されていることを確認し、「+ Add New Parameter」をクリックする
1. 選択した部分に対し変化させる値を設定し、「save」をクリックする（min:6, max:10, step:1）
1. 「SAVE ALL FILES」をクリックし設定内容を保存する
1. 設定が終了したら、右上のアイコンをクリックしてグラフビュー画面に遷移する

#### 1. 「＋Add New」

![img](./img/parameterstudy/add_targetFile.png "add_targetFile")  

#### 2. targetFileの設定

![img](./img/parameterstudy/set_targetFile.png "set_targetFile")  

#### 3. パラメータの範囲選択

![img](./img/parameterstudy/select_param.png "select_param")  

#### 4. パラメータの設定

![img](./img/parameterstudy/set_param.png "set_param")  

#### 5. 設定の保存

![img](./img/parameterstudy/save_files.png "save_files")  

#### 6. 編集したファイル名.jsonの確認
保存後、ワークフロー編集画面に戻りプロパティを表示すると、「 parameterSetting.json 」ファイルが作成されていることを確認します。  
このデータをプロパティ[ parameter setting file ]に設定します。

![img](./img/parameterstudy/set_json.png "set_json")  

以上がParameter Studyワークフローにおけるパラメータ設定手順になります。

## ■ PSワークフローの実行
PSワークフロー実行時のWHEELの動作について説明します。  
PSワークフロー実行時には、プロジェクトディレクトリ内に変化させるパラメータの数だけディレクトリを生成します。  
上記例では、三角形を構成する一つの頂点のY座標値を6から10まで変更しているため、「10-6＋1=5」計5個のディレクトリが生成されます。  
各ディレクトリには、PSコンポーネントのデータ及びパラメータ変化させたインプットデータが格納されています。

#### プロジェクトディレクトリ内に生成されるディレクトリ

![img](./img/parameterstudy/project_directory.png "project_directory")  

PSワークフローを実行すると生成されたワークフローが順に実行されます。  
実行後の結果は以下です。

#### PSワークフロー実行結果

![img](./img/parameterstudy/PS_finished.png "PS_finished") 

また、標準出力（Stdout）の結果は以下です。  

 ![img](./img/parameterstudy/PS_stdout.png "PS_stdout")   


