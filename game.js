// MEGA SLOT - ゲームロジック

class MegaSlotGame {
    constructor() {
        this.symbols = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '🎰'];
        this.reels = [];
        this.isSpinning = false;
        this.testMode = false;
        this.testSequence = ['secret', 'jackpot', 'bigwin', 'smallwin', 'lose'];
        this.testIndex = 0;
        this.currentPattern = null;
        
        this.init();
    }

    init() {
        this.loadGameSettings();
        this.setupEventListeners();
        this.checkTestMode();
        this.updateUI();
    }

    // ローカルストレージからゲーム設定を読み込み
    loadGameSettings() {
        // デフォルトパターンの作成
        const defaultPattern = {
            id: 'default',
            name: 'デフォルト',
            probabilities: {
                secret: 0.1,
                jackpot: 1.0,
                bigwin: 5.0,
                smallwin: 15.0,
                lose: 78.9
            },
            fixedCodes: {
                secret: '',
                jackpot: '',
                bigwin: '',
                smallwin: ''
            }
        };

        // パターンデータの初期化
        let patterns = JSON.parse(localStorage.getItem('slotPatterns') || '[]');
        if (patterns.length === 0) {
            patterns = [defaultPattern];
            localStorage.setItem('slotPatterns', JSON.stringify(patterns));
        }

        // アクティブパターンの設定
        const activePatternId = localStorage.getItem('activePattern') || 'default';
        this.currentPattern = patterns.find(p => p.id === activePatternId) || defaultPattern;

        // ロゴの読み込み
        const logoData = localStorage.getItem('gameLogo');
        if (logoData) {
            const logoImg = document.getElementById('game-logo');
            if (logoImg) {
                logoImg.src = logoData;
                logoImg.style.display = 'block';
            }
        }

        // 統計データの初期化
        if (!localStorage.getItem('gameStats')) {
            const initialStats = {
                totalPlays: 0,
                wins: {
                    secret: 0,
                    jackpot: 0,
                    bigwin: 0,
                    smallwin: 0
                }
            };
            localStorage.setItem('gameStats', JSON.stringify(initialStats));
        }

        // コード履歴の初期化
        if (!localStorage.getItem('codeHistory')) {
            localStorage.setItem('codeHistory', JSON.stringify([]));
        }
    }

    // イベントリスナーの設定
    setupEventListeners() {
        const spinBtn = document.getElementById('spin-btn');
        if (spinBtn) {
            spinBtn.addEventListener('click', () => this.spin());
        }

        // 確率入力の自動計算
        const probInputs = ['prob-secret', 'prob-jackpot', 'prob-bigwin', 'prob-smallwin'];
        probInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => this.calculateLoseProbability());
            }
        });
    }

    // テストモードの確認
    checkTestMode() {
        const urlParams = new URLSearchParams(window.location.search);
        this.testMode = urlParams.get('test') === 'true';
        
        if (this.testMode) {
            const testIndicator = document.getElementById('test-mode');
            if (testIndicator) {
                testIndicator.style.display = 'block';
            }
        }

        // パターン指定の確認
        const patternParam = urlParams.get('pattern');
        if (patternParam) {
            const patterns = JSON.parse(localStorage.getItem('slotPatterns') || '[]');
            const pattern = patterns.find(p => p.id === patternParam);
            if (pattern) {
                this.currentPattern = pattern;
            }
        }
    }

    // UIの更新
    updateUI() {
        const currentPatternElement = document.getElementById('current-pattern');
        if (currentPatternElement && this.currentPattern) {
            currentPatternElement.textContent = this.currentPattern.name;
        }
    }

    // スロット回転
    async spin() {
        if (this.isSpinning) return;

        this.isSpinning = true;
        const spinBtn = document.getElementById('spin-btn');
        const loadingOverlay = document.getElementById('loading-overlay');
        
        if (spinBtn) spinBtn.disabled = true;
        if (loadingOverlay) loadingOverlay.style.display = 'flex';

        // リール回転アニメーション
        await this.animateReels();

        // 結果判定
        const result = this.determineResult();
        
        // 結果表示
        this.displayResult(result);

        // 統計更新
        this.updateStats(result);

        // コード履歴追加
        this.addToHistory(result);

        // 特殊演出
        if (result.type === 'jackpot' || result.type === 'secret') {
            await this.showJackpotEffect();
        }

        if (loadingOverlay) loadingOverlay.style.display = 'none';
        if (spinBtn) spinBtn.disabled = false;
        this.isSpinning = false;
    }

    // リール回転アニメーション
    async animateReels() {
        const reels = document.querySelectorAll('.reel-symbols');
        const duration = 2000; // 2秒間回転
        const startTime = Date.now();

        return new Promise(resolve => {
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                reels.forEach((reel, index) => {
                    const speed = 20 - (progress * 15); // 徐々に減速
                    const offset = (elapsed * speed / 100) % (reel.children.length * 60);
                    reel.style.transform = `translateY(-${offset}px)`;
                });

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            animate();
        });
    }

    // 結果判定
    determineResult() {
        let resultType;

        if (this.testMode) {
            // テストモード: 順番に結果を返す
            resultType = this.testSequence[this.testIndex];
            this.testIndex = (this.testIndex + 1) % this.testSequence.length;
        } else {
            // 通常モード: 確率に基づく判定
            const random = Math.random() * 100;
            const probs = this.currentPattern.probabilities;
            
            if (random < probs.secret) {
                resultType = 'secret';
            } else if (random < probs.secret + probs.jackpot) {
                resultType = 'jackpot';
            } else if (random < probs.secret + probs.jackpot + probs.bigwin) {
                resultType = 'bigwin';
            } else if (random < probs.secret + probs.jackpot + probs.bigwin + probs.smallwin) {
                resultType = 'smallwin';
            } else {
                resultType = 'lose';
            }
        }

        // コード生成
        const code = this.generateCode(resultType);

        return {
            type: resultType,
            code: code,
            timestamp: new Date().toISOString(),
            pattern: this.currentPattern.name
        };
    }

    // コード生成
    generateCode(type) {
        const fixedCode = this.currentPattern.fixedCodes[type];
        if (fixedCode && fixedCode.trim()) {
            return fixedCode;
        }

        // 自動生成
        const prefix = {
            secret: 'SEC',
            jackpot: 'JP',
            bigwin: 'BW',
            smallwin: 'SW'
        }[type];

        if (!prefix) return ''; // ハズレの場合はコードなし

        const timestamp = Date.now().toString().slice(-6);
        const random = Math.random().toString(36).substr(2, 3).toUpperCase();
        return `${prefix}${timestamp}${random}`;
    }

    // 結果表示
    displayResult(result) {
        const resultType = document.getElementById('result-type');
        const resultCode = document.getElementById('result-code');

        if (resultType) {
            const typeNames = {
                secret: 'シークレット',
                jackpot: 'ジャックポット',
                bigwin: 'ビッグウィン',
                smallwin: 'スモールウィン',
                lose: 'ハズレ'
            };

            resultType.textContent = typeNames[result.type];
            resultType.className = `result-type result-${result.type}`;
        }

        if (resultCode) {
            resultCode.textContent = result.code || '';
            resultCode.style.display = result.code ? 'block' : 'none';
        }

        // リールの最終位置設定
        this.setFinalReelPosition(result.type);
    }

    // リールの最終位置設定
    setFinalReelPosition(resultType) {
        const reels = document.querySelectorAll('.reel-symbols');
        
        reels.forEach((reel, index) => {
            let symbolIndex;
            
            if (resultType === 'jackpot' || resultType === 'secret') {
                // 同じシンボルを揃える
                symbolIndex = 6; // 🎰
            } else if (resultType === 'bigwin') {
                symbolIndex = 5; // 💎
            } else if (resultType === 'smallwin') {
                symbolIndex = 4; // ⭐
            } else {
                // ハズレ: バラバラのシンボル
                symbolIndex = (index * 2) % this.symbols.length;
            }

            const offset = symbolIndex * 60;
            reel.style.transform = `translateY(-${offset}px)`;
            reel.style.transition = 'transform 0.5s ease-out';
        });

        // トランジション終了後にリセット
        setTimeout(() => {
            reels.forEach(reel => {
                reel.style.transition = '';
            });
        }, 500);
    }

    // ジャックポット演出
    async showJackpotEffect() {
        const overlay = document.getElementById('jackpot-overlay');
        if (!overlay) return;

        overlay.style.display = 'flex';
        
        return new Promise(resolve => {
            setTimeout(() => {
                overlay.style.display = 'none';
                resolve();
            }, 3000);
        });
    }

    // 統計更新
    updateStats(result) {
        const stats = JSON.parse(localStorage.getItem('gameStats'));
        stats.totalPlays++;
        
        if (result.type !== 'lose') {
            stats.wins[result.type]++;
        }

        localStorage.setItem('gameStats', JSON.stringify(stats));
    }

    // コード履歴追加
    addToHistory(result) {
        const history = JSON.parse(localStorage.getItem('codeHistory') || '[]');
        
        if (result.code) {
            history.unshift({
                id: Date.now().toString(),
                code: result.code,
                type: result.type,
                timestamp: result.timestamp,
                pattern: result.pattern
            });

            // 最新1000件まで保持
            if (history.length > 1000) {
                history.splice(1000);
            }

            localStorage.setItem('codeHistory', JSON.stringify(history));
        }
    }

    // ハズレ確率の自動計算
    calculateLoseProbability() {
        const secret = parseFloat(document.getElementById('prob-secret')?.value || 0);
        const jackpot = parseFloat(document.getElementById('prob-jackpot')?.value || 0);
        const bigwin = parseFloat(document.getElementById('prob-bigwin')?.value || 0);
        const smallwin = parseFloat(document.getElementById('prob-smallwin')?.value || 0);
        
        const total = secret + jackpot + bigwin + smallwin;
        const lose = Math.max(0, 100 - total);
        
        const loseInput = document.getElementById('prob-lose');
        if (loseInput) {
            loseInput.value = lose.toFixed(1);
        }

        return lose;
    }
}

// ページ読み込み時にゲーム初期化
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('spin-btn')) {
        new MegaSlotGame();
    }
});

