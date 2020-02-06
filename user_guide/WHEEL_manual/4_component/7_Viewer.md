# Viewer

![img](./img/viewer/viewer.png "viewer")  

Viewerコンポーネントは、結果ファイルを収集するために使用します。  
inputFilesに指定されたファイルを先行コンポーネントから受け取った後、ブラウザにて表示な可能なファイル（画像ファイル）が存在する場合は、別タブを起動し表示します。

Viewerコンポーネントのプロパティは以下です。  

| プロパティ | 入力値 | プロパティ説明 |
|----|----|----|
| name | 文字列 |  コンポーネントのディレクトリ名 |
| description | 文字列 | コンポーネントの説明文 | 
| inputFiles | ファイルまたはディレクトリ名 | 先行コンポーネントから受け取るファイル *1 | 

*1 ファイル形式は画像ファイル（拡張子png, jpg, gif, bmp）をサポートしています。  


# Viewerコンポーネントの使用例
Viewerコンポーネントのサンプルを示します。   
このサンプルでは、 captureTaskで撮影したスクリーンショット画像をsampleViewerに渡し、
別タブ（WHEEL viewer）で結果を確認します。

このワークフローは下記の処理を行います。

1. captureTaskコンポーネントにより、スクリーンショットを撮影する
1. スクリーンショットの画像ファイルをsampleViewerコンポーネントに渡す
1. 「WHEEL viewer」を新規タブで開く
1. 1.で撮影したスクリーンショット画像を表示する
  
## ■ Viewer ワークフロー構成図

![img](./img/viewer/Viewer_workflow.png "Viewer_workflow")  

## ■  ワークフローを構成するコンポーネント

| コンポーネントタイプ | コンポーネント名 | 入力ファイル | 出力ファイル | 設定ファイル |
|----|----|----|----|----|
| Task | captureTask | ー | スクリーンショットの画像ファイル | スクリーンショット撮影スクリプト |
| Viewer | sampleViewer | スクリーンショットの画像ファイル | ー | ー | 

## ■ 各コンポーネントのプロパティ
> captureTask（Taskコンポーネント）

| プロパティ名 | 設定値 |
| ---- | ---- |
| Name | captureTask |
| Script | capture.sh |
| InputFiles | - |
| OutputFiles | capture.png |
| Remotehost | localhost |
| Files | capture.sh, capture.png*1 | 
*1 capture.pngはcaputure.sh実行後に生成されるファイルです

#### ・ capture.sh

```
#!/bin/bash
CURRENT_DIR=$(pwd)
echo CURRENT_DIR = $CURRENT_DIR
screencapture -m $CURRENT_DIR/capture.png
```

> sampleViewer(VIewerコンポーネント)

| プロパティ名 | 設定値 |
| ---- | ---- |
| Name | sampleViewer |
| InputFiles | capture.png |
| Files | capture.png*2 | 
*2 capture.pngはcaptureTaskから渡されるファイルです

## ■ Viewer ワークフロー実行結果

![img](./img/viewer/WHEEL_viewer.png "WHEEL_viewer") 