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
        this.loadSavedConfig(); // ローカルストレージから設定と統計を読み込む
    }

    // 設定ファイルの読み込み
    async loadConfig() {
        try {
            // 動的に生成されたベースパスを使用
            const response = await fetch(window.basePath + 'config.json');
            const fetchedConfig = await response.json();

            // config.jsonが古い形式の場合、新しい形式に変換
            if (fetchedConfig.probabilities && !fetchedConfig.patterns) {
                this.config = {
                    patterns: {
                        'default': {
                            probabilities: fetchedConfig.probabilities,
                            bonusCodes: {
                                jackpot: '',
                                bigWin: '',
                                smallWin: '',
                                lose: ''
                            }
                        }
                    },
                    symbols: fetchedConfig.symbols,
                    gameSettings: fetchedConfig.gameSettings
                };
                console.warn('config.jsonが古い形式です。新しい形式に変換しました。');
            } else {
                this.config = fetchedConfig;
            }

            // アクティブなパターンIDをURLパラメータから取得
            const urlParams = new URLSearchParams(window.location.search);
            const patternId = urlParams.get('pattern');
            if (patternId && this.config.patterns[patternId]) {
                this.activePatternId = patternId;
                console.log(`アクティブな確率パターン: ${this.activePatternId}`);
            } else {
                this.activePatternId = 'default';
                console.log('デフォルトの確率パターンを使用します。');
            }

            console.log('設定ファイルが読み込まれました:', this.config);
        } catch (error) {
            console.error('設定ファイルの読み込みに失敗しました:', error);
            // デフォルト設定を使用
            this.config = {
                patterns: {
                    'default': {
                        probabilities: {
                            jackpot: 0.01,
                            bigWin: 0.05,
                            smallWin: 0.15,
                            lose: 0.79
                        },
                        bonusCodes: {
                            jackpot: 'JP_DEFAULT',
                            bigWin: 'BW_DEFAULT',
                            smallWin: 'SW_DEFAULT',
                            lose: 'LOSE_DEFAULT'
                        }
                    }
                },
                symbols: ["🍒", "🍋", "🍊", "🍇", "🔔", "⭐", "💎", "7️⃣"],
                gameSettings: {
                    spinDuration: 2000,
                    reelStopDelay: 500,
                    animationSpeed: 20
                }
            };
            console.warn('デフォルト設定を使用しました。');
        }
    }

    // 現在アクティブな確率パターンを取得
    getCurrentProbabilities() {
        return this.config.patterns[this.activePatternId].probabilities;
    }

    // 現在アクティブなボーナスコードを取得
    getCurrentBonusCodes() {
        return this.config.patterns[this.activePatternId].bonusCodes;
    }

    // スピン結果の決定
    determineResult() {
        const probs = this.getCurrentProbabilities();
        const rand = Math.random();
        let cumulativeProbability = 0;

        if (rand < (cumulativeProbability += probs.jackpot)) {
            return 'jackpot';
        } else if (rand < (cumulativeProbability += probs.bigWin)) {
            return 'bigWin';
        } else if (rand < (cumulativeProbability += probs.smallWin)) {
            return 'smallWin';
        } else {
            return 'lose';
        }
    }

    // コードの生成
    generateCode(resultType) {
        const bonusCodes = this.getCurrentBonusCodes();
        const fixedCode = bonusCodes[resultType];

        if (fixedCode) {
            return fixedCode; // 固定コードがあればそれを返す
        } else {
            // 以前のランダムコード生成ロジック（フォールバック）
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let code = '';
            for (let i = 0; i < 10; i++) {
                code += characters.charAt(Math.floor(Math.random() * characters.length));
            }
            return `${this.config.winPatterns[resultType].codePrefix || 'CODE'}-${code}`;
        }
    }

    // 統計の更新
    updateStatistics(result, generatedCode) {
        this.statistics.totalSpins++;
        if (result !== 'lose') {
            this.statistics.wins[result]++;
        }
        this.statistics.codesGenerated.push({
            type: result,
            code: generatedCode,
            timestamp: new Date().toISOString(),
            pattern: this.activePatternId // どのパターンで生成されたか記録
        });
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

    // 設定と統計の保存（ローカルストレージ）
    saveStatistics() {
        localStorage.setItem('slotGameStats', JSON.stringify(this.statistics));
        // localStorage.setItem('slotGamePlayed', 'true'); // プレイ済みフラグは別途管理
    }

    // 設定と統計の読み込み（ローカルストレージ）
    loadSavedConfig() {
        const savedStats = localStorage.getItem('slotGameStats');
        
        if (savedStats) {
            this.statistics = JSON.parse(savedStats);
        }
    }

    // ユーザーが既にプレイしたかどうかのチェック
    hasPlayed() {
        // 現在のパターンIDと日付を組み合わせたキーを使用
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        return localStorage.getItem(`slotGamePlayed_${this.activePatternId}_${today}`) === 'true';
    }

    // ユーザーがプレイしたことを記録
    setPlayed() {
        const today = new Date().toISOString().slice(0, 10);
        localStorage.setItem(`slotGamePlayed_${this.activePatternId}_${today}`, 'true');
    }

    // プレイ済みフラグをリセット（デバッグ用など）
    resetPlayed() {
        const today = new Date().toISOString().slice(0, 10);
        localStorage.removeItem(`slotGamePlayed_${this.activePatternId}_${today}`);
    }

    // 新しい確率パターンを追加/更新
    updatePattern(patternId, probabilities, bonusCodes) {
        if (!this.config.patterns) {
            this.config.patterns = {};
        }
        this.config.patterns[patternId] = {
            probabilities: probabilities,
            bonusCodes: bonusCodes
        };
        // config.jsonを更新するAPIがないため、ローカルストレージに保存するなどの対応が必要になる
        // 現状はメモリ上のconfigを更新するのみ
        console.log(`パターン ${patternId} を更新しました:`, this.config.patterns[patternId]);
    }

    // パターンを削除
    deletePattern(patternId) {
        if (this.config.patterns[patternId]) {
            delete this.config.patterns[patternId];
            console.log(`パターン ${patternId} を削除しました。`);
        }
    }

    // 全てのパターンを取得
    getAllPatterns() {
        return this.config.patterns;
    }
}

// グローバルなゲームマネージャーインスタンス
const gameManager = new SlotGameManager();
