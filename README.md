# Bluesky-comic-uploader
**Languages:** [日本語](README.md) | [English](README.en.md)

クリップスタジオで出力した漫画ページをBlueskyにスレッド投稿するWebアプリケーションです。[GitHub Pages](https://tohu-sand.github.io/Bluesky-comic-uploader/)で公開しています。

## 主な特徴
- App Passwordログインで利用可能 (OAuthは現時点で未実装)
- クリスタで発行した原稿データフォルダ／複数ファイルのドラッグ＆ドロップ取り込み、自動並び替え
- 4枚ごとの自動分割とスレッド生成
- テキスト／ALTテンプレート、白紙候補検出、ブラウザ内予約投稿

## 使い方
1. CLIP STUDIO PAINT（クリスタ）でPNG一括出力（例: manga_001.png, manga_002.png...）
2. PDS URL・ハンドル/DID・App Passwordを入力してログイン
3. 画像をドラッグ＆ドロップし、不要ページを除外
4. 本文・テンプレートを調整し、最終確認で構成と予約設定を確認
5. 投稿または予約を実行（注: 予約投稿は投稿時刻までアプリのタブを開いたままにする必要があります）

## ライセンス
本プロジェクトは MIT ライセンスのもとで公開されています。詳細は [LICENSE](LICENSE) ファイルをご確認ください。
