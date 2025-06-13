// ゲーム統計とロジック管理クラス
class SlotGameManager {
    constructor() {
        this.config = null;
        this.activePatternId = 'default'; // 現在アクティブな確率パターンID
        this.statistics = {
            totalSpins: 0,
            wins: {
                jackpot: 0,
                bigWin: 0,
                smallWin: 0
            },
            codesGenerated: []
        };
        this.loadConfig();
        this.loadSavedConfig(); // ローカルストレージから設定と統計を読み込み
    }

    // 設定ファイルの読み込み
    async loadConfig() {
        try {
            // 動的に生成されたベースパスを使用
            const response = await fetch(window.basePath + 'config.json');
            const loadedConfig = await response.json();
            
            // ローカルストレージに保存された設定があればそれを優先
            const savedConfig = localStorage.getItem('slotGameConfig');
            if (savedConfig) {
                this.config = JSON.parse(savedConfig);
                console.log('ローカルストレージから設定が読み込まれました:', this.config);
            } else {
                this.config = loadedConfig;
                console.log('config.jsonから設定が読み込まれました:', this.config);
            }

            // URLパラメータからアクティブなパターンIDを設定
            const urlParams = new URLSearchParams(window.location.search);
            const patternFromUrl = urlParams.get('pattern');
            if (patternFromUrl && this.config[patternFromUrl]) {
                this.activePatternId = patternFromUrl;
                console.log(`URLパラメータからアクティブなパターンを「${this.activePatternId}」に設定しました。`);
            } else if (!this.config[this.activePatternId]) {
                // アクティブなパターンが存在しない場合、デフォルトに戻す
                this.activePatternId = 'default';
                console.warn(`アクティブなパターン「${patternFromUrl}」が見つかりませんでした。デフォルトパターンに戻します。`);
            }

        } catch (error) {
            console.error('設定ファイルの読み込みに失敗しました:', error);
            // デフォルト設定を使用（config.jsonの読み込みに失敗した場合）
            this.config = {
                "default": {
                    "probabilities": {
                        "jackpot": 0.01,
                        "bigWin": 0.05,
                        "smallWin": 0.15,
                        "lose": 0.79
                    },
                    "bonusCodes": {
                        "jackpot": "JP_BONUS_CODE",
                        "bigWin": "BW_REWARD_CODE",
                        "smallWin": "SW_GIFT_CODE",
                        "lose": "LOSE_TRY_AGAIN"
                    },
                    "symbols": ["🍒", "🍊", "🍇", "🔔", "⭐", "7️⃣"],
                    "gameSettings": {
                        "spinDuration": 2000,
                        "reelStopDelay": 300
                    },
                    "winPatterns": {
                        "jackpot": {
                            "message": "🎉 JACKPOT! 🎉",
                            "codePrefix": "JP",
                            "description": "3つ揃い"
                        },
                        "bigWin": {
                            "message": "🎊 BIG WIN! 🎊",
                            "codePrefix": "BW",
                            "description": "2つ同じ絵柄"
                        },
                        "smallWin": {
                            "message": "✨ WIN! ✨",
                            "codePrefix": "SW",
                            "description": "特定の組み合わせ"
                        }
                    }
                }
            };
            console.log('デフォルト設定を使用します。', this.config);
        }
    }

    // 現在アクティブな設定を取得
    getCurrentConfig() {
        return this.config[this.activePatternId];
    }

    // アクティブなパターンを設定
    setActivePattern(patternId) {
        if (this.config[patternId]) {
            this.activePatternId = patternId;
            this.saveConfig(); // アクティブパターンも保存
            return true;
        }
        return false;
    }

    // すべての確率パターンを取得
    getAllProbabilityPatterns() {
        return this.config;
    }

    // 現在の確率設定を新しいパターンとして保存
    saveCurrentProbabilitiesAsNewPattern(newPatternId) {
        if (this.config[newPatternId]) {
            return false; // 既に存在するID
        }
        this.config[newPatternId] = JSON.parse(JSON.stringify(this.getCurrentConfig())); // ディープコピー
        this.activePatternId = newPatternId;
        this.saveConfig();
        return true;
    }

    // 選択したパターンを現在の設定で更新
    updateSelectedPattern(patternId) {
        if (!this.config[patternId]) {
            return false; // 存在しないID
        }
        this.config[patternId] = JSON.parse(JSON.stringify(this.getCurrentConfig())); // ディープコピー
        this.saveConfig();
        return true;
    }

    // 確率パターンを削除
    deleteProbabilityPattern(patternId) {
        if (patternId === 'default' || !this.config[patternId]) {
            return false; // デフォルトは削除不可、または存在しない
        }
        delete this.config[patternId];
        if (this.activePatternId === patternId) {
            this.activePatternId = 'default'; // 削除したパターンがアクティブならデフォルトに戻す
        }
        this.saveConfig();
        return true;
    }

    // 確率を更新
    updateProbabilities(jackpot, bigWin, smallWin, lose) {
        const current = this.getCurrentConfig();
        current.probabilities = {
            jackpot: jackpot,
            bigWin: bigWin,
            smallWin: smallWin,
            lose: lose
        };
        this.saveConfig();
    }

    // 確率をデフォルトに戻す
    resetProbabilities() {
        const current = this.getCurrentConfig();
        current.probabilities = {
            jackpot: 0.01,
            bigWin: 0.05,
            smallWin: 0.15,
            lose: 0.79
        };
        this.saveConfig();
    }

    // ボーナスコードを更新
    updateBonusCodes(jackpotCode, bigWinCode, smallWinCode, loseCode) {
        const current = this.getCurrentConfig();
        current.bonusCodes = {
            jackpot: jackpotCode,
            bigWin: bigWinCode,
            smallWin: smallWinCode,
            lose: loseCode
        };
        this.saveConfig();
    }

    // 結果を決定
    determineResult() {
        const probabilities = this.getCurrentConfig().probabilities;
        const rand = Math.random();
        let cumulativeProbability = 0;

        for (const resultType in probabilities) {
            cumulativeProbability += probabilities[resultType];
            if (rand < cumulativeProbability) {
                return resultType;
            }
        }
        return 'lose'; // フォールバック
    }

    // 結果に応じたシンボルを設定
    setResultSymbols(resultType) {
        const symbols = this.getCurrentConfig().symbols;
        let resultSymbols = [];

        switch (resultType) {
            case 'jackpot':
                // 全て同じシンボル (例: 777)
                const jackpotSymbol = symbols[symbols.length - 1]; // 最後のシンボルを7とする
                resultSymbols = [jackpotSymbol, jackpotSymbol, jackpotSymbol];
                break;
            case 'bigWin':
                // 2つ同じシンボル (例: 🍒🍒🍊)
                const bigWinSymbol = symbols[Math.floor(Math.random() * (symbols.length - 1))]; // 7以外
                let otherSymbol;
                do {
                    otherSymbol = symbols[Math.floor(Math.random() * symbols.length)];
                } while (otherSymbol === bigWinSymbol);
                
                const positions = [0, 1, 2].sort(() => Math.random() - 0.5);
                resultSymbols[positions[0]] = bigWinSymbol;
                resultSymbols[positions[1]] = bigWinSymbol;
                resultSymbols[positions[2]] = otherSymbol;
                break;
            case 'smallWin':
                // 特定の組み合わせ (例: 🍒🍊🍒)
                const s1 = symbols[Math.floor(Math.random() * symbols.length)];
                const s2 = symbols[Math.floor(Math.random() * symbols.length)];
                resultSymbols = [s1, s2, s1];
                break;
            case 'lose':
            default:
                // 全て異なるシンボル
                resultSymbols = symbols.sort(() => Math.random() - 0.5).slice(0, 3);
                break;
        }
        return resultSymbols;
    }

    // コードを生成
    generateCode(resultType) {
        const bonusCodes = this.getCurrentConfig().bonusCodes;
        const fixedCode = bonusCodes[resultType];
        if (fixedCode) {
            return fixedCode; // 固定コードが設定されていればそれを返す
        }

        const prefix = this.getCurrentConfig().winPatterns[resultType].codePrefix;
        const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
        const code = `${prefix}-${randomPart}`;
        
        this.statistics.codesGenerated.push({
            code: code,
            result: resultType,
            timestamp: new Date().toISOString(),
            pattern: this.activePatternId
        });
        this.saveStatistics();
        return code;
    }

    // 統計を更新
    updateStatistics(result, generatedCode) {
        this.statistics.totalSpins++;
        if (result !== 'lose') {
            this.statistics.wins[result]++;
        }
        // コード生成はgenerateCode内で処理されるため、ここでは統計更新のみ
        this.saveStatistics();
    }

    // 統計の取得
    getStatistics() {
        const winRate = this.statistics.totalSpins > 0 ? 
            (Object.values(this.statistics.wins).reduce((a, b) => a + b, 0) / this.statistics.totalSpins * 100).toFixed(2) : 0;
        
        return {
            ...this.statistics,
            winRate: winRate + '%'
        };
    }

    // 統計をクリア
    clearStatistics() {
        this.statistics = {
            totalSpins: 0,
            wins: {
                jackpot: 0,
                bigWin: 0,
                smallWin: 0
            },
            codesGenerated: []
        };
        this.saveStatistics();
    }

    // 設定の保存（ローカルストレージ）
    saveConfig() {
        localStorage.setItem('slotGameConfig', JSON.stringify(this.config));
        localStorage.setItem('slotGameActivePattern', this.activePatternId); // アクティブパターンも保存
    }

    // 設定と統計の読み込み（ローカルストレージ）
    loadSavedConfig() {
        const savedConfig = localStorage.getItem('slotGameConfig');
        const savedStats = localStorage.getItem('slotGameStats');
        const savedActivePattern = localStorage.getItem('slotGameActivePattern');
        
        if (savedConfig) {
            this.config = JSON.parse(savedConfig);
        }
        
        if (savedStats) {
            this.statistics = JSON.parse(savedStats);
        }

        if (savedActivePattern && this.config[savedActivePattern]) {
            this.activePatternId = savedActivePattern;
        }
    }

    // ユーザーが既にプレイしたかどうかのチェック
    hasPlayed() {
        // 現在のパターンIDと日付を組み合わせたキーを使用
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const playedKey = `slotGamePlayed_${this.activePatternId}_${today}`;
        return localStorage.getItem(playedKey) === 'true';
    }

    // ユーザーがプレイしたことを記録
    setPlayed() {
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const playedKey = `slotGamePlayed_${this.activePatternId}_${today}`;
        localStorage.setItem(playedKey, 'true');
    }

    // プレイ済みフラグをリセット（デバッグ用など）
    resetPlayed() {
        // 全てのプレイ済みフラグをリセットするのではなく、現在アクティブなパターンの今日のフラグのみリセット
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const playedKey = `slotGamePlayed_${this.activePatternId}_${today}`;
        localStorage.removeItem(playedKey);
    }
}

// グローバルなゲームマネージャーインスタンス
const gameManager = new SlotGameManager();
