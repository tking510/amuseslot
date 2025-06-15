// MEGA SLOT - 管理画面ロジック

class MegaSlotAdmin {
    constructor() {
        this.currentEditingPattern = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadPatterns();
        this.loadStatistics();
        this.loadHistory();
        this.loadSettings();
        this.updatePreviewLinks();
    }

    // イベントリスナーの設定
    setupEventListeners() {
        // ナビゲーション
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchSection(e.target.dataset.section);
            });
        });

        // パターン管理
        document.getElementById('new-pattern-btn')?.addEventListener('click', () => {
            this.showPatternForm();
        });

        document.getElementById('save-pattern-btn')?.addEventListener('click', () => {
            this.savePattern();
        });

        document.getElementById('cancel-pattern-btn')?.addEventListener('click', () => {
            this.hidePatternForm();
        });

        // 確率入力の自動計算
        ['prob-secret', 'prob-jackpot', 'prob-bigwin', 'prob-smallwin'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => {
                this.calculateLoseProbability();
            });
        });

        // 統計リセット
        document.getElementById('reset-stats-btn')?.addEventListener('click', () => {
            this.resetStatistics();
        });

        // 履歴管理
        document.getElementById('export-history-btn')?.addEventListener('click', () => {
            this.exportHistory();
        });

        document.getElementById('clear-history-btn')?.addEventListener('click', () => {
            this.clearHistory();
        });

        // ロゴ管理
        document.getElementById('logo-upload')?.addEventListener('change', (e) => {
            this.previewLogo(e.target.files[0]);
        });

        document.getElementById('save-logo-btn')?.addEventListener('click', () => {
            this.saveLogo();
        });

        document.getElementById('remove-logo-btn')?.addEventListener('click', () => {
            this.removeLogo();
        });

        // プレビューリンク
        document.getElementById('preview-pattern-select')?.addEventListener('change', () => {
            this.updatePreviewLinks();
        });

        document.getElementById('generate-url-btn')?.addEventListener('click', () => {
            this.generateCustomURL();
        });
    }

    // セクション切り替え
    switchSection(sectionId) {
        // ナビゲーションボタンの更新
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionId}"]`)?.classList.add('active');

        // セクションの表示切り替え
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionId)?.classList.add('active');

        // セクション固有の処理
        switch (sectionId) {
            case 'statistics':
                this.loadStatistics();
                break;
            case 'history':
                this.loadHistory();
                break;
            case 'preview':
                this.updatePreviewPatternSelect();
                this.updatePreviewLinks();
                break;
        }
    }

    // アラート表示
    showAlert(message, type = 'success') {
        const container = document.getElementById('alert-container');
        if (!container) return;

        const alert = document.createElement('div');
        alert.className = `alert ${type}`;
        alert.textContent = message;

        container.innerHTML = '';
        container.appendChild(alert);

        setTimeout(() => {
            alert.remove();
        }, 5000);
    }

    // パターン管理
    loadPatterns() {
        const patterns = JSON.parse(localStorage.getItem('slotPatterns') || '[]');
        const activePatternId = localStorage.getItem('activePattern') || 'default';
        const patternList = document.getElementById('pattern-list');

        if (!patternList) return;

        patternList.innerHTML = '';

        patterns.forEach(pattern => {
            const patternItem = document.createElement('div');
            patternItem.className = `pattern-item ${pattern.id === activePatternId ? 'active' : ''}`;
            
            patternItem.innerHTML = `
                <div class="pattern-info">
                    <div class="pattern-name">${pattern.name}</div>
                    <div class="pattern-details">
                        JP: ${pattern.probabilities.jackpot}% | 
                        BW: ${pattern.probabilities.bigwin}% | 
                        SW: ${pattern.probabilities.smallwin}%
                    </div>
                </div>
                <div class="pattern-actions">
                    ${pattern.id !== activePatternId ? 
                        `<button class="pattern-btn activate" onclick="admin.activatePattern('${pattern.id}')">有効化</button>` : 
                        '<span style="color: #ffd700; font-weight: bold;">アクティブ</span>'
                    }
                    <button class="pattern-btn edit" onclick="admin.editPattern('${pattern.id}')">編集</button>
                    ${pattern.id !== 'default' ? 
                        `<button class="pattern-btn delete" onclick="admin.deletePattern('${pattern.id}')">削除</button>` : ''
                    }
                </div>
            `;

            patternList.appendChild(patternItem);
        });
    }

    showPatternForm(pattern = null) {
        this.currentEditingPattern = pattern;
        const form = document.getElementById('pattern-form');
        if (!form) return;

        if (pattern) {
            // 編集モード
            document.getElementById('pattern-name').value = pattern.name;
            document.getElementById('prob-secret').value = pattern.probabilities.secret;
            document.getElementById('prob-jackpot').value = pattern.probabilities.jackpot;
            document.getElementById('prob-bigwin').value = pattern.probabilities.bigwin;
            document.getElementById('prob-smallwin').value = pattern.probabilities.smallwin;
            document.getElementById('code-secret').value = pattern.fixedCodes.secret || '';
            document.getElementById('code-jackpot').value = pattern.fixedCodes.jackpot || '';
            document.getElementById('code-bigwin').value = pattern.fixedCodes.bigwin || '';
            document.getElementById('code-smallwin').value = pattern.fixedCodes.smallwin || '';
        } else {
            // 新規作成モード
            document.getElementById('pattern-name').value = '';
            document.getElementById('prob-secret').value = '0.1';
            document.getElementById('prob-jackpot').value = '1.0';
            document.getElementById('prob-bigwin').value = '5.0';
            document.getElementById('prob-smallwin').value = '15.0';
            document.getElementById('code-secret').value = '';
            document.getElementById('code-jackpot').value = '';
            document.getElementById('code-bigwin').value = '';
            document.getElementById('code-smallwin').value = '';
        }

        this.calculateLoseProbability();
        form.style.display = 'block';
        document.getElementById('new-pattern-btn').style.display = 'none';
    }

    hidePatternForm() {
        document.getElementById('pattern-form').style.display = 'none';
        document.getElementById('new-pattern-btn').style.display = 'block';
        this.currentEditingPattern = null;
    }

    savePattern() {
        const name = document.getElementById('pattern-name').value.trim();
        if (!name) {
            this.showAlert('パターン名を入力してください', 'error');
            return;
        }

        const probabilities = {
            secret: parseFloat(document.getElementById('prob-secret').value),
            jackpot: parseFloat(document.getElementById('prob-jackpot').value),
            bigwin: parseFloat(document.getElementById('prob-bigwin').value),
            smallwin: parseFloat(document.getElementById('prob-smallwin').value),
            lose: parseFloat(document.getElementById('prob-lose').value)
        };

        // 確率の合計チェック
        const total = probabilities.secret + probabilities.jackpot + probabilities.bigwin + probabilities.smallwin;
        if (total > 100) {
            this.showAlert('確率の合計が100%を超えています', 'error');
            return;
        }

        const fixedCodes = {
            secret: document.getElementById('code-secret').value.trim(),
            jackpot: document.getElementById('code-jackpot').value.trim(),
            bigwin: document.getElementById('code-bigwin').value.trim(),
            smallwin: document.getElementById('code-smallwin').value.trim()
        };

        const patterns = JSON.parse(localStorage.getItem('slotPatterns') || '[]');
        
        if (this.currentEditingPattern) {
            // 編集
            const index = patterns.findIndex(p => p.id === this.currentEditingPattern.id);
            if (index !== -1) {
                patterns[index] = {
                    ...this.currentEditingPattern,
                    name,
                    probabilities,
                    fixedCodes
                };
            }
        } else {
            // 新規作成
            const id = 'pattern_' + Date.now();
            patterns.push({
                id,
                name,
                probabilities,
                fixedCodes
            });
        }

        localStorage.setItem('slotPatterns', JSON.stringify(patterns));
        this.loadPatterns();
        this.hidePatternForm();
        this.showAlert('パターンを保存しました');
    }

    editPattern(patternId) {
        const patterns = JSON.parse(localStorage.getItem('slotPatterns') || '[]');
        const pattern = patterns.find(p => p.id === patternId);
        if (pattern) {
            this.showPatternForm(pattern);
        }
    }

    deletePattern(patternId) {
        if (!confirm('このパターンを削除しますか？')) return;

        const patterns = JSON.parse(localStorage.getItem('slotPatterns') || '[]');
        const filteredPatterns = patterns.filter(p => p.id !== patternId);
        
        localStorage.setItem('slotPatterns', JSON.stringify(filteredPatterns));
        this.loadPatterns();
        this.showAlert('パターンを削除しました');
    }

    activatePattern(patternId) {
        localStorage.setItem('activePattern', patternId);
        this.loadPatterns();
        this.showAlert('パターンを有効化しました');
    }

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

    // 統計情報
    loadStatistics() {
        const stats = JSON.parse(localStorage.getItem('gameStats') || '{"totalPlays":0,"wins":{"secret":0,"jackpot":0,"bigwin":0,"smallwin":0}}');
        const statsGrid = document.getElementById('stats-grid');

        if (!statsGrid) return;

        const totalWins = stats.wins.secret + stats.wins.jackpot + stats.wins.bigwin + stats.wins.smallwin;
        const winRate = stats.totalPlays > 0 ? ((totalWins / stats.totalPlays) * 100).toFixed(1) : '0.0';

        statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${stats.totalPlays}</div>
                <div class="stat-label">総プレイ回数</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.wins.secret}</div>
                <div class="stat-label">シークレット</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.wins.jackpot}</div>
                <div class="stat-label">ジャックポット</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.wins.bigwin}</div>
                <div class="stat-label">ビッグウィン</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.wins.smallwin}</div>
                <div class="stat-label">スモールウィン</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${winRate}%</div>
                <div class="stat-label">勝率</div>
            </div>
        `;
    }

    resetStatistics() {
        if (!confirm('統計データをリセットしますか？この操作は取り消せません。')) return;

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
        this.loadStatistics();
        this.showAlert('統計データをリセットしました');
    }

    // コード履歴
    loadHistory() {
        const history = JSON.parse(localStorage.getItem('codeHistory') || '[]');
        const tbody = document.getElementById('history-tbody');

        if (!tbody) return;

        tbody.innerHTML = '';

        history.slice(0, 100).forEach(item => { // 最新100件表示
            const row = document.createElement('tr');
            const date = new Date(item.timestamp).toLocaleString('ja-JP');
            
            row.innerHTML = `
                <td>${date}</td>
                <td style="font-family: monospace;">${item.code}</td>
                <td><span class="code-type ${item.type}">${this.getTypeLabel(item.type)}</span></td>
                <td>${item.pattern}</td>
            `;

            tbody.appendChild(row);
        });
    }

    getTypeLabel(type) {
        const labels = {
            secret: 'シークレット',
            jackpot: 'ジャックポット',
            bigwin: 'ビッグウィン',
            smallwin: 'スモールウィン',
            lose: 'ハズレ'
        };
        return labels[type] || type;
    }

    exportHistory() {
        const history = JSON.parse(localStorage.getItem('codeHistory') || '[]');
        
        if (history.length === 0) {
            this.showAlert('エクスポートする履歴がありません', 'warning');
            return;
        }

        const csv = [
            ['日時', 'コード', 'タイプ', 'パターン'],
            ...history.map(item => [
                new Date(item.timestamp).toLocaleString('ja-JP'),
                item.code,
                this.getTypeLabel(item.type),
                item.pattern
            ])
        ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `slot_history_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        this.showAlert('履歴をエクスポートしました');
    }

    clearHistory() {
        if (!confirm('コード履歴をクリアしますか？この操作は取り消せません。')) return;

        localStorage.setItem('codeHistory', JSON.stringify([]));
        this.loadHistory();
        this.showAlert('履歴をクリアしました');
    }

    // ロゴ管理
    previewLogo(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('logo-preview');
            if (preview) {
                preview.src = e.target.result;
                preview.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    }

    saveLogo() {
        const preview = document.getElementById('logo-preview');
        
        if (!preview || !preview.src || preview.src === window.location.href) {
            this.showAlert('ロゴ画像を選択してください', 'error');
            return;
        }

        localStorage.setItem('gameLogo', preview.src);
        this.showAlert('ロゴを保存しました');
    }

    removeLogo() {
        if (!confirm('ロゴを削除しますか？')) return;

        localStorage.removeItem('gameLogo');
        const preview = document.getElementById('logo-preview');
        if (preview) {
            preview.style.display = 'none';
            preview.src = '';
        }
        
        const upload = document.getElementById('logo-upload');
        if (upload) {
            upload.value = '';
        }

        this.showAlert('ロゴを削除しました');
    }

    loadSettings() {
        const logoData = localStorage.getItem('gameLogo');
        if (logoData) {
            const preview = document.getElementById('logo-preview');
            if (preview) {
                preview.src = logoData;
                preview.style.display = 'block';
            }
        }
    }

    // プレビュー機能
    updatePreviewPatternSelect() {
        const patterns = JSON.parse(localStorage.getItem('slotPatterns') || '[]');
        const select = document.getElementById('preview-pattern-select');

        if (!select) return;

        select.innerHTML = '';
        patterns.forEach(pattern => {
            const option = document.createElement('option');
            option.value = pattern.id;
            option.textContent = pattern.name;
            select.appendChild(option);
        });
    }

    updatePreviewLinks() {
        const select = document.getElementById('preview-pattern-select');
        const normalLink = document.getElementById('normal-game-link');
        const testLink = document.getElementById('test-game-link');

        if (!select || !normalLink || !testLink) return;

        const selectedPattern = select.value;
        const baseUrl = window.location.origin + window.location.pathname.replace('admin.html', 'index.html');

        normalLink.href = selectedPattern ? `${baseUrl}?pattern=${selectedPattern}` : baseUrl;
        testLink.href = selectedPattern ? `${baseUrl}?pattern=${selectedPattern}&test=true` : `${baseUrl}?test=true`;
    }

    generateCustomURL() {
        const customName = document.getElementById('custom-url-name').value.trim();
        const select = document.getElementById('preview-pattern-select');
        
        if (!customName) {
            this.showAlert('カスタムURL名を入力してください', 'error');
            return;
        }

        const selectedPattern = select?.value;
        const baseUrl = window.location.origin + window.location.pathname.replace('admin.html', 'index.html');
        const customUrl = selectedPattern ? 
            `${baseUrl}?pattern=${selectedPattern}&name=${encodeURIComponent(customName)}` : 
            `${baseUrl}?name=${encodeURIComponent(customName)}`;

        const resultDiv = document.getElementById('generated-url');
        if (resultDiv) {
            resultDiv.innerHTML = `
                <strong>生成されたURL:</strong><br>
                <a href="${customUrl}" target="_blank">${customUrl}</a>
            `;
        }

        this.showAlert('カスタムURLを生成しました');
    }
}

// グローバル変数として管理画面インスタンスを作成
let admin;

// ページ読み込み時に管理画面初期化
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.admin-container')) {
        admin = new MegaSlotAdmin();
    }
});

