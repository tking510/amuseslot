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
            const loadedConfig = await response.json();
            
            // 複数パターン対応
            if (loadedConfig.patterns) {
                this.config = loadedConfig;
            } else {
                // 既存の単一設定をパターン1として扱う
                this.config = {
                    patterns: {
                        'default': loadedConfig
                    },
                    activePatternId: 'default'
                };
            }
            console.log('設定ファイルが読み込まれました:', this.config);
        } catch (error) {
            console.error('設定ファイルの読み込みに失敗しました:', error);
            // デフォルト設定を使用
            this.config = {
                patterns: {
                    'pattern1': {
                        probabilities: {
                            jackpot: 0.01,
                            bigWin: 0.05,
                            smallWin: 0.15,
                            lose: 0.79
                        },
                        winPatterns: {
                            jackpot: {
                                message: "🎉 JACKPOT! 🎉",
                                codePrefix: "JP",
                                multiplier: 1000,
                                description: "全て同じ絵柄",
                                fixedCode: ""
                            },
                            bigWin: {
                                message: "🎊 BIG WIN! 🎊",
                                codePrefix: "BW",
                                multiplier: 100,
                                description: "2つ同じ絵柄",
                                fixedCode: ""
                            },
                            smallWin: {
                                message: "✨ WIN! ✨",
                                codePrefix: "SW",
                                multiplier: 10,
                                description: "特定の組み合わせ",
                                fixedCode: ""
                            },
                            lose: {
                                message: "残念！もう一度チャレンジ！",
                                codePrefix: "LOSE",
                                multiplier: 0,
                                description: "ハズレ",
                                fixedCode: ""
                            }
                        },
                        symbols: ['🍒', '🍋', '🍊', '🍇', '🔔', '⭐', '💎', '7️⃣'],
                        gameSettings: {
                            spinDuration: 2000,
                            reelStopDelay: 500,
                            animationSpeed: 20
                        }
                    },
                    'pattern2': {
                        probabilities: {
                            jackpot: 0.005,
                            bigWin: 0.03,
                            smallWin: 0.10,
                            lose: 0.865
                        },
                        winPatterns: {
                            jackpot: {
                                message: "🎉 JACKPOT! 🎉",
                                codePrefix: "JP2",
                                multiplier: 1000,
                                description: "全て同じ絵柄",
                                fixedCode: ""
                            },
                            bigWin: {
                                message: "🎊 BIG WIN! 🎊",
                                codePrefix: "BW2",
                                multiplier: 100,
                                description: "2つ同じ絵柄",
                                fixedCode: ""
                            },
                            smallWin: {
                                message: "✨ WIN! ✨",
                                codePrefix: "SW2",
                                multiplier: 10,
                                description: "特定の組み合わせ",
                                fixedCode: ""
                            },
                            lose: {
                                message: "残念！もう一度チャレンジ！",
                                codePrefix: "LOSE2",
                                multiplier: 0,
                                description: "ハズレ",
                                fixedCode: ""
                            }
                        },
                        symbols: ['🍒', '🍋', '🍊', '🍇', '🔔', '⭐', '💎', '7️⃣'],
                        gameSettings: {
                            spinDuration: 2000,
                            reelStopDelay: 500,
                            animationSpeed: 20
                        }
                    },
                    'pattern3': {
                        probabilities: {
                            jackpot: 0.02,
                            bigWin: 0.08,
                            smallWin: 0.20,
                            lose: 0.70
                        },
                        winPatterns: {
                            jackpot: {
                                message: "🎉 JACKPOT! 🎉",
                                codePrefix: "JP3",
                                multiplier: 1000,
                                description: "全て同じ絵柄",
                                fixedCode: ""
                            },
                            bigWin: {
                                message: "🎊 BIG WIN! 🎊",
                                codePrefix: "BW3",
                                multiplier: 100,
                                description: "2つ同じ絵柄",
                                fixedCode: ""
                            },
                            smallWin: {
                                message: "✨ WIN! ✨",
                                codePrefix: "SW3",
                                multiplier: 10,
                                description: "特定の組み合わせ",
                                fixedCode: ""
                            },
                            lose: {
                                message: "残念！もう一度チャレンジ！",
                                codePrefix: "LOSE3",
                                multiplier: 0,
                                description: "ハズレ",
                                fixedCode: ""
                            }
                        },
                        symbols: ['🍒', '🍋', '🍊', '🍇', '🔔', '⭐', '💎', '7️⃣'],
                        gameSettings: {
                            spinDuration: 2000,
                            reelStopDelay: 500,
                            animationSpeed: 20
                        }
                    }
                },
                activePatternId: 'pattern1'
            };
        }
        // URLパラメータからアクティブなパターンIDを設定
        const urlParams = new URLSearchParams(window.location.search);
        const patternId = urlParams.get('pattern');
        if (patternId && this.config.patterns[patternId]) {
            this.activePatternId = patternId;
            console.log(`アクティブなパターンを ${this.activePatternId} に設定しました。`);
        } else {
            console.log(`デフォルトパターン ${this.activePatternId} を使用します。`);
        }
    }

    // 現在アクティブな設定を取得
    getCurrentConfig() {
        return this.config.patterns[this.activePatternId];
    }

    // 確率設定の更新
    updateProbabilities(newProbabilities) {
        if (this.config && this.config.patterns[this.activePatternId]) {
            this.config.patterns[this.activePatternId].probabilities = { ...this.config.patterns[this.activePatternId].probabilities, ...newProbabilities };
            console.log('確率が更新されました:', this.config.patterns[this.activePatternId].probabilities);
            this.saveConfig();
        }
    }

    // ボーナスコードの更新
    updateBonusCode(type, newCode) {
        if (this.config && this.config.patterns[this.activePatternId] && this.config.patterns[this.activePatternId].winPatterns[type]) {
            this.config.patterns[this.activePatternId].winPatterns[type].fixedCode = newCode;
            console.log(`${type}のボーナスコードが更新されました: ${newCode}`);
            this.saveConfig();
        }
    }

    // 当選判定（重み付きランダム）
    determineResult() {
        const currentConfig = this.getCurrentConfig();
        const rand = Math.random();
        const probs = currentConfig.probabilities;
        
        let cumulative = 0;
        for (const [type, probability] of Object.entries(probs)) {
            cumulative += probability;
            if (rand < cumulative) {
                return type;
            }
        }
        
        return 'lose'; // フォールバック
    }

    // コード生成
    generateCode(type) {
        const currentConfig = this.getCurrentConfig();
        const pattern = currentConfig.winPatterns[type];
        if (!pattern) return null;

        // 固定コードが設定されていればそれを使用
        if (pattern.fixedCode && pattern.fixedCode !== "") {
            return pattern.fixedCode;
        }

        // 固定コードがなければ動的に生成
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        const checksum = this.calculateChecksum(timestamp + random);
        const code = `${pattern.codePrefix}${timestamp}${random}${checksum}`;
        
        return code;
    }

    // チェックサム計算（簡単な検証用）
    calculateChecksum(str) {
        let sum = 0;
        for (let i = 0; i < str.length; i++) {
            sum += str.charCodeAt(i);
        }
        return (sum % 36).toString(36).toUpperCase();
    }

    // 結果に基づくシンボル設定
    setResultSymbols(result) {
        const currentConfig = this.getCurrentConfig();
        const symbols = currentConfig.symbols;
        let finalSymbols = [];
        
        switch (result) {
            case 'jackpot':
                // 全て同じシンボル（高価値シンボル優先）
                const jackpotSymbol = this.getHighValueSymbol();
                finalSymbols = [jackpotSymbol, jackpotSymbol, jackpotSymbol];
                break;
                
            case 'bigWin':
                // 2つ同じシンボル
                const winSymbol = symbols[Math.floor(Math.random() * symbols.length)];
                const otherSymbol = symbols[Math.floor(Math.random() * symbols.length)];
                finalSymbols = [winSymbol, winSymbol, otherSymbol];
                break;
                
            case 'smallWin':
                // 特定の組み合わせパターン
                const smallWinPatterns = [
                    ['🍒', '🍋', '🍒'],
                    ['🔔', '🔔', '⭐'],
                    ['🍇', '🍊', '🍇']
                ];
                finalSymbols = smallWinPatterns[Math.floor(Math.random() * smallWinPatterns.length)];
                break;
                
            default:
                // ランダム（ハズレ）
                finalSymbols = this.generateLosingCombination();
                break;
        }
        
        return finalSymbols;
    }

    // 高価値シンボルの取得
    getHighValueSymbol() {
        const currentConfig = this.getCurrentConfig();
        const highValueSymbols = ['💎', '7️⃣', '⭐'];
        return highValueSymbols[Math.floor(Math.random() * highValueSymbols.length)];
    }

    // ハズレの組み合わせ生成
    generateLosingCombination() {
        const currentConfig = this.getCurrentConfig();
        const symbols = currentConfig.symbols;
        let combination;
        
        do {
            combination = [
                symbols[Math.floor(Math.random() * symbols.length)],
                symbols[Math.floor(Math.random() * symbols.length)],
                symbols[Math.floor(Math.random() * symbols.length)]
            ];
        } while (this.isWinningCombination(combination));
        
        return combination;
    }

    // 当選組み合わせかどうかの判定
    isWinningCombination(symbols) {
        // 全て同じ
        if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
            return true;
        }
        
        // 2つ同じ
        if (symbols[0] === symbols[1] || symbols[1] === symbols[2] || symbols[0] === symbols[2]) {
            return true;
        }
        
        // 特定のパターン
        const winPatterns = [
            ['🍒', '🍋', '🍒'],
            ['🔔', '🔔', '⭐'],
            ['🍇', '🍊', '🍇']
        ];
        
        return winPatterns.some(pattern => 
            pattern[0] === symbols[0] && 
            pattern[1] === symbols[1] && 
            pattern[2] === symbols[2]
        );
    }

    // 統計の更新
    updateStatistics(result, generatedCode) {
        this.statistics.totalSpins++;
        if (result !== 'lose') {
            this.statistics.wins[result]++;
        }
        // コード履歴に記録
        this.statistics.codesGenerated.push({
            code: generatedCode,
            type: result,
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
    saveConfig() {
        localStorage.setItem('slotGameConfig', JSON.stringify(this.config));
    }

    saveStatistics() {
        localStorage.setItem('slotGameStats', JSON.stringify(this.statistics));
        localStorage.setItem('slotGamePlayed', 'true'); // プレイ済みフラグを設定
    }

    // 設定と統計の読み込み（ローカルストレージ）
    loadSavedConfig() {
        const savedConfig = localStorage.getItem('slotGameConfig');
        const savedStats = localStorage.getItem('slotGameStats');
        
        if (savedConfig) {
            const parsedConfig = JSON.parse(savedConfig);
            // 既存の単一設定を複数パターン形式に変換
            if (!parsedConfig.patterns) {
                this.config = {
                    patterns: {
                        'default': parsedConfig
                    },
                    activePatternId: 'default'
                };
            } else {
                this.config = parsedConfig;
            }
        }
        
        if (savedStats) {
            this.statistics = JSON.parse(savedStats);
        }
    }

    // ユーザーが既にプレイしたかどうかのチェック
    hasPlayed() {
        return localStorage.getItem('slotGamePlayed') === 'true';
    }

    // ユーザーがプレイしたことを記録
    setPlayed() {
        localStorage.setItem('slotGamePlayed', 'true');
    }

    // プレイ済みフラグをリセット（デバッグ用など）
    resetPlayed() {
        localStorage.removeItem('slotGamePlayed');
    }

    // 新しい確率パターンを追加
    addProbabilityPattern(patternId, probabilities, winPatterns, symbols, gameSettings) {
        if (this.config && !this.config.patterns[patternId]) {
            this.config.patterns[patternId] = {
                probabilities: probabilities,
                winPatterns: winPatterns,
                symbols: symbols,
                gameSettings: gameSettings
            };
            this.saveConfig();
            return true;
        }
        return false;
    }

    // 確率パターンを削除
    deleteProbabilityPattern(patternId) {
        if (this.config && this.config.patterns[patternId] && patternId !== 'default') {
            delete this.config.patterns[patternId];
            if (this.activePatternId === patternId) {
                this.activePatternId = 'default'; // 削除したパターンがアクティブならデフォルトに戻す
            }
            this.saveConfig();
            return true;
        }
        return false;
    }

    // アクティブな確率パターンを設定
    setActivePattern(patternId) {
        if (this.config && this.config.patterns[patternId]) {
            this.activePatternId = patternId;
            this.saveConfig();
            return true;
        }
        return false;
    }

    // 全ての確率パターンを取得
    getAllPatterns() {
        return this.config ? this.config.patterns : {};
    }

    // 統計情報をリセット
    resetStatistics() {
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

    // コード履歴をクリア
    clearCodeHistory() {
        this.statistics.codesGenerated = [];
        this.saveStatistics();
    }

    // ロゴ画像のURLを更新
    updateLogoUrl(url) {
        if (this.config && this.config.patterns[this.activePatternId]) {
            this.config.patterns[this.activePatternId].gameSettings.logoUrl = url;
            this.saveConfig();
            console.log('ロゴURLが更新されました:', url);
        }
    }
}

// gameManagerインスタンスをグローバルに公開
const gameManager = new SlotGameManager();

// DOMContentLoadedで初期化処理を呼び出す
document.addEventListener('DOMContentLoaded', async () => {
    await gameManager.loadConfig();
    console.log("gameManagerが初期化されました。");
});
