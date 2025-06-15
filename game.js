// MEGA SLOT - ゲームロジック

class MegaSlotGame {
    constructor() {
        this.symbols = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '🎰'];
        this.symbolValues = {
            '🎰': 7,  // 最強（シークレット・ジャックポット）
            '💎': 6,  // ビッグウィン
            '⭐': 5,  // スモールウィン
            '🍇': 4,
            '🍊': 3,
            '🍋': 2,
            '🍒': 1   // 最弱
        };
        this.reels = [];
        this.isSpinning = false;
        this.testMode = false;
        this.testSequence = ['secret', 'jackpot', 'bigwin', 'smallwin', 'lose'];
        this.testIndex = 0;
        this.currentPattern = null;
        this.maxSpins = null;
        this.remainingSpins = null;
        
        this.init();
    }

    init() {
        this.loadGameSettings();
        this.setupEventListeners();
        this.checkTestMode();
        this.checkSpinLimit();
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
    }

    // テストモードの確認
    checkTestMode() {
        const urlParams = new URLSearchParams(window.location.search);
        this.testMode = urlParams.get('test') === 'true';

        // パターン指定の確認（暗号化されたパラメータ）
        const encodedPattern = urlParams.get('p');
        if (encodedPattern) {
            try {
                const patternId = this.decodePattern(encodedPattern);
                const patterns = JSON.parse(localStorage.getItem('slotPatterns') || '[]');
                const pattern = patterns.find(p => p.id === patternId);
                if (pattern) {
                    this.currentPattern = pattern;
                }
            } catch (e) {
                console.warn('Invalid pattern parameter');
            }
        }
    }

    // 回数制限の確認
    checkSpinLimit() {
        const urlParams = new URLSearchParams(window.location.search);
        const maxSpins = urlParams.get('limit');
        
        if (maxSpins && !isNaN(maxSpins)) {
            this.maxSpins = parseInt(maxSpins);
            this.remainingSpins = this.maxSpins;
            
            const counter = document.getElementById('spin-counter');
            const remainingElement = document.getElementById('remaining-spins');
            
            if (counter && remainingElement) {
                counter.style.display = 'block';
                remainingElement.textContent = this.remainingSpins;
            }
        }
    }

    // パターンエンコード/デコード
    encodePattern(patternId) {
        return btoa(patternId).replace(/[+=]/g, '');
    }

    decodePattern(encoded) {
        return atob(encoded);
    }

    // UIの更新
    updateUI() {
        // パターン表示は削除済み
    }

    // スロット回転
    async spin() {
        if (this.isSpinning) return;

        // 回数制限チェック
        if (this.maxSpins !== null && this.remainingSpins <= 0) {
            alert('回転回数の上限に達しました。');
            return;
        }

        this.isSpinning = true;
        const spinBtn = document.getElementById('spin-btn');
        
        if (spinBtn) spinBtn.disabled = true;

        // 結果を事前に決定
        const result = this.determineResult();

        // ジャックポットまたはシークレットの場合、ブラックアウト演出
        if (result.type === 'jackpot' || result.type === 'secret') {
            await this.showBlackoutEffect();
        }

        // リール回転アニメーション
        await this.animateReels(result);

        // 結果表示
        this.displayResult(result);

        // 統計更新
        this.updateStats(result);

        // コード履歴追加
        this.addToHistory(result);

        // 回数制限更新
        if (this.maxSpins !== null) {
            this.remainingSpins--;
            const remainingElement = document.getElementById('remaining-spins');
            if (remainingElement) {
                remainingElement.textContent = this.remainingSpins;
            }
        }

        // ジャックポット演出
        if (result.type === 'jackpot' || result.type === 'secret') {
            await this.showJackpotEffect();
        }

        if (spinBtn) spinBtn.disabled = false;
        this.isSpinning = false;
    }

    // ブラックアウト演出
    async showBlackoutEffect() {
        const overlay = document.getElementById('blackout-overlay');
        if (!overlay) return;

        overlay.style.display = 'flex';
        
        return new Promise(resolve => {
            setTimeout(() => {
                overlay.style.display = 'none';
                resolve();
            }, 2000);
        });
    }

    // リール回転アニメーション（改良版）
    async animateReels(result) {
        const reels = document.querySelectorAll('.reel-symbols');
        const duration = 3000; // 3秒間回転
        const startTime = Date.now();

        // 最終停止位置を計算
        const finalPositions = this.calculateFinalPositions(result);

        return new Promise(resolve => {
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                reels.forEach((reel, index) => {
                    if (progress < 1) {
                        // 回転中
                        const speed = 30 - (progress * 25); // 徐々に減速
                        const offset = (elapsed * speed / 100) % (reel.children.length * 60);
                        reel.style.transform = `translateY(-${offset}px)`;
                        reel.style.transition = 'none';
                    } else {
                        // 最終位置に停止
                        reel.style.transform = `translateY(-${finalPositions[index]}px)`;
                        reel.style.transition = 'transform 0.5s ease-out';
                    }
                });

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    // 停止後の処理
                    setTimeout(() => {
                        reels.forEach(reel => {
                            reel.style.transition = '';
                        });
                        resolve();
                    }, 500);
                }
            };
            animate();
        });
    }

    // 最終停止位置の計算
    calculateFinalPositions(result) {
        const positions = [];
        
        switch (result.type) {
            case 'secret':
            case 'jackpot':
                // 3つ揃い（🎰）
                positions.push(6 * 60, 5 * 60, 4 * 60); // 各リールで🎰が中央に来る位置
                break;
            case 'bigwin':
                // 3つ揃い（💎）
                positions.push(5 * 60, 4 * 60, 3 * 60);
                break;
            case 'smallwin':
                // 2つ揃い（⭐）
                positions.push(4 * 60, 3 * 60, 1 * 60); // 最初の2つだけ揃う
                break;
            default:
                // ハズレ（バラバラ）
                positions.push(
                    Math.floor(Math.random() * 7) * 60,
                    Math.floor(Math.random() * 7) * 60,
                    Math.floor(Math.random() * 7) * 60
                );
                // 揃わないように調整
                while (positions[0] === positions[1] || positions[1] === positions[2] || positions[0] === positions[2]) {
                    positions[2] = Math.floor(Math.random() * 7) * 60;
                }
                break;
        }
        
        return positions;
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
}

// ページ読み込み時にゲーム初期化
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('spin-btn')) {
        new MegaSlotGame();
    }
});

