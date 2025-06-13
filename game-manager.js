    // 設定ファイルの読み込み
    async loadConfig() {
        try {
            // 動的に生成されたベースパスを使用
            const response = await fetch(window.basePath + 'config.json');
            this.config = await response.json();
            console.log('設定ファイルが読み込まれました:', this.config);
        } catch (error) {
            console.error('設定ファイルの読み込みに失敗しました:', error);
            // デフォルト設定を使用
            // ... (元のコード)
        }
    }
