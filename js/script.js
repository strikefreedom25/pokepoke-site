
let cards = []
let dropZone;
const clickCounts = {};    // カードごとのクリック数を保持
let remainingCountDisplay;
const MAX_DECK_SIZE = 20;
let pyodide = null;
let pyodideReady = false;


async function initializePyodide() {
    pyodide = await loadPyodide();
    await pyodide.loadPackage(["micropip"]);

    const response = await fetch("simulate.py");
    const pythonCode = await response.text();
    await pyodide.runPythonAsync(pythonCode);
    pyodideReady = true;
    console.log("Pyodide 初期化完了");
}

initializePyodide();

fetch('cards.json')
    .then(response => response.json())
    .then(data => {
        cards = data;
        renderCards(cards);
    })
    .catch(error => console.error("カードデータの読み込みに失敗しました", error));

//共通関数
async function runSimulationWithPyodide(moduleName, stats) {
    if (!pyodideReady) {
        alert("Pyodideがまだ初期化されていません");
        return;
    }

    const response = await fetch(`${moduleName}.py`);
    const code = await response.text();
    await pyodide.runPythonAsync(code);

    for (const [key, value] of Object.entries(stats)) {
        pyodide.globals.set(key, value);
    }

    const args = Object.keys(stats).join(", ");
    const result = pyodide.runPython(`${moduleName}(${args})`);
    return result.toJs(); // PyodideのPythonオブジェクトをJS配列に変換
}


function typeToText(typeId) {
    const types = ["草", "炎", "水", "雷", "超", "闘", "悪", "鋼", "ドラゴン", "無"];
    return types[typeId] || "不明";
}
function evoTotText(evoValue) {
    const types = ["たね", "1進化", "2進化"];
    return types[evoValue] || "不明";
}
function packNameTotText(packName) {
    if (packName === "genetic_apex") return "最強の遺伝子";
    if (packName === "mythical_island") return "幻のいる島";
    if (packName === "spacetime_smackdown") return "時空の激闘";
    if (packName === "triumphant_light") return "超克の光";
    if (packName === "shining_revelry") return "シャイニングハイ";
    if (packName === "celestial_guardians") return "双天の守護者";
    console.log(packName);

    //if (packName === "extradimensional_crisis") return "異次元のクライシス";
    return "不明";
}
//エネルギータイプ → アイコン番号のマッピング関数
function energyTypeToIconIndex(type) {
    const map = {
        grass: 1,
        fire: 2,
        water: 3,
        lightning: 4,
        psychic: 5,
        fighting: 6,
        darkness: 7,
        metal: 8,
        colorless: 10,
        C: 10
    };
    return map[type] || 10;
}
//アイコンHTMLを生成する関数
function renderEnergyIcons(energyData) {
    let html = "";
    for (const [type, count] of Object.entries(energyData)) {
        const iconIndex = energyTypeToIconIndex(type);
        for (let i = 0; i < count; i++) {
            html += `<img src="images/icon_${iconIndex}.png" alt="${type}" class="energy-icon">`;
        }
    }
    return html;
}


// タイプ番号からクラス名に変換する関数
function typeIdToClass(typeId) {
    const map = {
        1: "grass",
        2: "fire",
        3: "water",
        4: "electric",
        5: "psychic",
        6: "fighting",
        7: "dark",
        8: "steel",
        9: "dragon",
        10: "colorless"
    };
    return map[typeId] || "unknown";
}

// すべてのフィルターを適用する関数
function applyAllFilters() {
    console.log("applyAllFilters 呼び出し");

    const keyword = document.getElementById("searchInput").value.trim();
    const typeValue = document.getElementById("typeSelect").value;
    const exValue = document.getElementById("exSelect").value;
    const evoValue = document.getElementById("evoSelect").value;
    const abilityValue = document.getElementById("abilitySelect").value;


    const selectedSkills = Array.from(document.querySelectorAll('input[name="skill"]:checked')).map(cb => cb.value);

    const detailMap = {
        heal: document.getElementById("healDetailSelect")?.value || "",
        damage: document.getElementById("damageDetailSelect")?.value || "",
        defense: document.getElementById("defenseDetailSelect")?.value || "",
        status: document.getElementById("statusDetailSelect")?.value || "",
        search: document.getElementById("searchDetailSelect")?.value || "",
        energy_gain: document.getElementById("energy_gainDetailSelect")?.value || "",
        energy_trash: document.getElementById("energy_trashDetailSelect")?.value || "",
        move: document.getElementById("moveDetailSelect")?.value || "",
        risk: document.getElementById("riskDetailSelect")?.value || "",
        buff: document.getElementById("buffDetailSelect")?.value || "",
        debuff: document.getElementById("debuffDetailSelect")?.value || "",
        others: document.getElementById("othersDetailSelect")?.value || ""
    };

    const filtered = cards.filter(card => {
        const cardName = toHiragana(card.name);
        const searchKeyword = toHiragana(keyword);
        const matchName = keyword === "" || cardName.startsWith(searchKeyword);
        const matchType = typeValue === "all" || parseInt(card.type) === parseInt(typeValue);

        const matchEx = (
            exValue === "all" || card.ex === parseInt(exValue)
        );
        const matchEvo = (
            evoValue === "all" || card.evo === parseInt(evoValue)
        );
        const hasAbility = card.character_ability && typeof card.character_ability === "object" && Object.keys(card.character_ability).length > 0;

        const matchAbility =
            abilityValue === "all" ||
            (abilityValue === "has" && hasAbility) ||
            (abilityValue === "none" && !hasAbility);


        const allAbilities = [card.atk1_ability, card.atk2_ability, card.character_ability].filter(Boolean);

        const matchSkill = selectedSkills.length === 0 || selectedSkills.some(skill => {
            const detail = detailMap[skill];
            return allAbilities.some(ability => {
                const data = ability[skill];
                return checkSkillCondition(skill, data, detail);
            });
        });
        return matchName && matchType && matchSkill && matchEx && matchEvo && matchAbility;
    });
    renderCards(filtered);
}

function checkSkillCondition(skill, data, detail) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return false;

    // スキルごとの詳細フィルター条件に応じて処理分岐
    switch (skill) {
        case "heal":
            if (detail === "all" || detail === "") return true;
            if (detail === "self") return data.target === "self";
            if (detail === "own_all") return data.target === "own_all";
            if (detail === "others") return !["self", "own_all"].includes(data.target);
            return true;

        case "damage":
            if (detail === "all" || detail === "") return true;
            if (["opponent_choice", "opponent_bench_choice", "opponent_bench_all"].includes(detail)) return data.target === detail;
            if (["coin", "random", "counter"].includes(detail)) return data.type === detail;
            if (detail === "opponent_active_ex") return data.condition === detail;
            if (detail === "others") return !["opponent_choice", "opponent_bench_choice", "opponent_bench_all"].includes(data.target) && !["coin", "random", "counter"].includes(data.type) && data.condition !== "opponent_active_ex";
            return true;

        case "defense":
            if (detail === "all" || detail === "") return true;
            if (["damage_reduction", "effect_nullify"].includes(detail)) return data.type === detail;
            if (detail === "others") return !["damage_reduction", "effect_nullify"].includes(data.type);
            return true;

        case "status":
            if (detail === "all" || detail === "") return true;
            if (["burn", "poison", "sleep", "paralyze", "confusion"].includes(detail)) return data.type === detail;
            if (detail === "others") return !["burn", "poison", "sleep", "paralyze", "confusion"].includes(data.type);
            return true;

        case "search":
            if (detail === "all" || detail === "") return true;
            if (detail === "specific_card_to_bench") return data.type === detail;
            if (detail === "grass") return data.type2 === detail;
            if (detail === "monster") return data.card_type2 === detail;
            if (detail === "lycanroc") return data.type === detail;
            if (detail === "others") return !["specific_card_to_bench", "lycanroc"].includes(data.type) && data.type2 !== "grass" && data.card_type2 !== "monster";
            return true;

        case "energy_gain":
            if (detail === "all" || detail === "") return true;
            const energyTypes = ["grass", "fire", "water", "lightnig", "psychic", "fighting", "darkdess", "metal", "C"];
            if (energyTypes.includes(detail)) return data.energy === detail;
            if (detail === "others") return !energyTypes.includes(data.energy);
            return true;

        case "energy_trash":
            if (detail === "all" || detail === "") return true;
            if (["self", "opponent_active", "all_energy"].includes(detail)) return data.target === detail;
            if (detail === "others") return !["self", "opponent_active", "all_energy"].includes(data.target);
            return true;

        case "move":
            if (detail === "all" || detail === "") return true;
            if (["self", "opponent_active"].includes(detail)) return data.target === detail;
            if (detail === "a") return data.type === detail;
            if (detail === "others") return !["self", "opponent_active"].includes(data.target) && data.type !== "a";
            return true;

        case "risk":
            if (detail === "all" || detail === "") return true;
            if (["self_dmg", "restriction", "aa"].includes(detail)) return data.type === detail;
            if (detail === "others") return !["self_dmg", "restriction", "aa"].includes(data.type);
            return true;

        case "buff":
            if (detail === "all" || detail === "") return true;
            if (detail === "attack") return data.type === "attack";
            if (detail === "others") return data.type !== "attack";
            return true;

        case "debuff":
            if (detail === "all" || detail === "") return true;
            if (["attack", "cannot_retreat"].includes(detail)) return data.type === detail;
            if (detail === "others") return !["attack", "cannot_retreat"].includes(data.type);
            return true;

        case "others":
            if (detail === "all" || detail === "") return true;
            if (detail === "reval_hand") return data.type === "reval_hand";
            if (detail === "others") return data.type !== "reval_hand";
            return true;


        default:
            console.warn(`未知のスキルカテゴリ: ${skill} `);
            return false;
    }

}

// スキル詳細選択肢の表示・非表示を切り替える
function toggleSkillDetails() {
    const skills = document.querySelectorAll('input[name="skill"]');
    skills.forEach(skill => {
        const detailId = skill.value + "DetailContainer";
        const detailDiv = document.getElementById(detailId);
        if (detailDiv) {
            detailDiv.style.display = skill.checked ? "block" : "none";
        }
    });
}

// スキルチェックボックスの変更時処理
document.querySelectorAll('input[name="skill"]').forEach(cb => {
    cb.addEventListener("change", () => {
        applyAllFilters();
        toggleSkillDetails();
    });
});




// カタカナをひらがなに変換する関数
function toHiragana(str) {
    return str.replace(/[\u30a1-\u30f6]/g, ch =>
        String.fromCharCode(ch.charCodeAt(0) - 0x60)
    );
}

// タイプIDを日本語表記に変換する関数
function typeToText(typeId) {
    const types = ["", "草", "炎", "水", "雷", "超", "闘", "悪", "鋼", "ドラゴン", "無"];
    return types[typeId] || "不明";
}

// 入力欄やセレクト変更時にフィルターを適用
document.getElementById("searchInput").addEventListener("input", applyAllFilters);
document.getElementById("typeSelect").addEventListener("change", applyAllFilters);
document.getElementById("exSelect").addEventListener("change", applyAllFilters);
document.getElementById("evoSelect").addEventListener("change", applyAllFilters);
document.getElementById("abilitySelect").addEventListener("change", applyAllFilters);
document.querySelectorAll('input[name="skill"]').forEach(cb => cb.addEventListener("change", applyAllFilters));



// リセットボタン処理（フォーム初期化）
document.getElementById("resetButton").addEventListener("click", () => {
    document.getElementById("searchInput").value = "";
    document.getElementById("typeSelect").value = "all";
    document.getElementById("exSelect").value = "all";
    document.getElementById("evoSelect").value = "all";
    document.getElementById("abilitySelect").value = "all";

    const selectAll = document.getElementById("selectAllSkills");
    if (selectAll) {
        selectAll.checked = false;
    }

    document.querySelectorAll('input[name="skill"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('select[id$="DetailSelect"]').forEach(select => {
        select.value = "all";
    });

    const detailDivs = document.querySelectorAll('[id$="DetailContainer"]');
    detailDivs.forEach(div => div.style.display = "none");

    renderCards(cards); // 全カード表示
});

// 各詳細セレクトボックスの変更にもフィルターを適用
document.querySelectorAll('select[id$="DetailSelect"]').forEach(select => {
    select.addEventListener("change", applyAllFilters);
});

//開閉処理
document.addEventListener("DOMContentLoaded", function () {
    const toggleBtn = document.getElementById("toggleSkillBtn");
    const skillSection = document.getElementById("skillSection");

    toggleBtn.addEventListener("click", function () {
        const isHidden = skillSection.style.display === "none" || skillSection.style.display === "";
        skillSection.style.display = isHidden ? "block" : "none";
        toggleBtn.textContent = isHidden ? "スキル欄を隠す" : "スキルで検索";
    });
});

//　1/2または2/2の数を取得するための関数
function getCardCountInDeck(cardNumber) {
    return Array.from(document.querySelectorAll("#cardSelectArea .card"))
        .filter(card => card.dataset.cardNumber === cardNumber)
        .reduce((sum, card) => {
            const countSpan = card.querySelector(".card-count");
            const count = parseInt(countSpan?.dataset.count || "1", 10);
            return sum + count;
        }, 0);
}
// 1/2or2/2の表示を更新する関数
function updateClickMark(cardNumber) {
    const rightCards = document.querySelectorAll(`#cardContainer .card[data-card-number="${cardNumber}"]`);
    const countInDeck = getCardCountInDeck(cardNumber);

    rightCards.forEach(card => {
        card.querySelectorAll(".click-mark").forEach(el => el.remove());

        if (countInDeck >= 1) {
            const markElem = document.createElement("div");
            markElem.className = "click-mark";
            markElem.textContent = `${countInDeck}/2`;
            markElem.style.position = "absolute";
            markElem.style.top = "50%";
            markElem.style.left = "50%";
            markElem.style.transform = "translate(-50%, -50%)";
            markElem.style.fontSize = "1.5em";
            markElem.style.color = "black";
            markElem.style.backgroundColor = "rgba(255, 255, 255, 0.55)";
            markElem.style.padding = "4px 8px";
            markElem.style.borderRadius = "8px";
            markElem.style.pointerEvents = "none";
            card.appendChild(markElem);
        }
    });
}



function collectDeckStats() {
    const cardsInDeck = Array.from(document.querySelectorAll("#cardSelectArea .card"));

    const stats = {
        num_tane: 0,
        num_stage1: 0,
        num_stage2: 0,
        num_target_tane: 0,
        num_target_evo1: 0,
        num_target_evo2: 0,
        num_H: 0,
        num_M: 0,
        num_candy: 0
    };

    // ✅ それぞれの select から選択中のターゲット名を取得
    const selectedTane = document.getElementById("targetSelectTane")?.value || "";
    const selectedEvo1 = document.getElementById("targetSelectEvo1")?.value || "";
    const selectedEvo2 = document.getElementById("targetSelectEvo2")?.value || "";

    cardsInDeck.forEach(card => {
        const name = card.querySelector(".card-title")?.textContent.trim();
        const count = parseInt(card.querySelector(".card-count")?.dataset.count || "1", 10);
        const cardNumber = card.dataset.cardNumber;
        const cardData = cards.find(c => c.number === cardNumber);

        if (!cardData) return;

        // ✅ アイテム・サポート類のカウント
        if (name === "博士の研究") stats.num_H += count;
        else if (name === "モンスターボール") stats.num_M += count;
        else if (name === "ふしぎなアメ") stats.num_candy += count;

        // ✅ ターゲット指定のカード枚数をそれぞれ加算
        if (name === selectedTane) stats.num_target_tane += count;
        if (name === selectedEvo1) stats.num_target_evo1 += count;
        if (name === selectedEvo2) stats.num_target_evo2 += count;

        // ✅ 進化段階ごとのカウント
        if (cardData.evo === 0) stats.num_tane += count;
        else if (cardData.evo === 1) stats.num_stage1 += count;
        else if (cardData.evo === 2) stats.num_stage2 += count;
    });

    return stats;
}



document.addEventListener("DOMContentLoaded", () => {
    dropZone = document.getElementById("cardSelectArea");
    const resetButton = document.getElementById("resetDeck");
    remainingCountDisplay = document.getElementById("remainingCount");
    const professorButton = document.getElementById("addProfessor");
    const ballButton = document.getElementById("addBall");
    const candyButton = document.getElementById("addCandy");



    // ボタンイベント
    professorButton.addEventListener("click", () => {
        addCardByName("博士の研究");
    });
    ballButton.addEventListener("click", () => {
        addCardByName("モンスターボール");
    });
    candyButton.addEventListener("click", () => {
        addCardByName("ふしぎなアメ");
    });

    // リセット処理
    resetButton.addEventListener("click", () => {
        dropZone.innerHTML = "";
        updateRemainingCount();
        updateTargetSelectOptions(); // ←これを追加


        // 🔽 追加：クリック数のリセット
        for (const key in clickCounts) {
            delete clickCounts[key];
        }

        // 🔽 追加：右パネルカード内の①②マークを削除（再描画されない場合に備えて）
        document.querySelectorAll(".click-mark").forEach(el => el.remove());
    });




    // -------------------- 共通関数 --------------------
    async function runSimulationWithPyodide(moduleName, stats, keys) {
        if (!pyodideReady) {
            alert("Pyodideがまだ初期化されていません");
            return;
        }

        const code = await (await fetch(`${moduleName}.py`)).text();
        await pyodide.runPythonAsync(code);

        for (const key of keys) {
            pyodide.globals.set(key, stats[key]);
        }

        const args = keys.join(", ");
        const result = pyodide.runPython(`${moduleName}(${args})`);
        return result.toJs();
    }
    function showResult(probabilities, label = "結果") {
        const resultContainer = document.getElementById("resultArea");
        const prevContainer = document.getElementById("prevResultArea");

        if (!resultContainer || !prevContainer) return;

        // 前回の結果を保存
        prevContainer.innerHTML = resultContainer.innerHTML;

        // 最新の結果を描画
        const html = `
        <div id="label-font-size">${label}のドロー確率</div>
        <ul>
            ${probabilities.map((p, i) => `<li>ターン${i}: ${Math.round(p * 100)}%</li>`).join("")}
        </ul>
    `;
        resultContainer.innerHTML = html;
    }


    // -------------------- デッキ統計を集計 --------------------
    function collectDeckStats() {
        const cardsInDeck = Array.from(document.querySelectorAll("#cardSelectArea .card"));
        const stats = {
            num_tane: 0,
            num_stage1: 0,
            num_stage2: 0,
            num_target_tane: 0,
            num_target_evo1: 0,
            num_target_evo2: 0,
            num_H: 0,
            num_M: 0,
            num_candy: 0,
        };

        const selectedTane = document.getElementById("targetSelectTane")?.value || "";
        const selectedEvo1 = document.getElementById("targetSelectEvo1")?.value || "";
        const selectedEvo2 = document.getElementById("targetSelectEvo2")?.value || "";

        cardsInDeck.forEach(card => {
            const name = card.querySelector(".card-title")?.textContent.trim();
            const count = parseInt(card.querySelector(".card-count")?.dataset.count || "1", 10);
            const cardNumber = card.dataset.cardNumber;
            const cardData = cards.find(c => c.number === cardNumber);

            if (!cardData) return;

            if (name === "博士の研究") stats.num_H += count;
            else if (name === "モンスターボール") stats.num_M += count;
            else if (name === "ふしぎなアメ") stats.num_candy += count;

            if (name === selectedTane) stats.num_target_tane += count;
            if (name === selectedEvo1) stats.num_target_evo1 += count;
            if (name === selectedEvo2) stats.num_target_evo2 += count;

            if (cardData.evo === 0) stats.num_tane += count;
            else if (cardData.evo === 1) stats.num_stage1 += count;
            else if (cardData.evo === 2) stats.num_stage2 += count;
        });

        return stats;
    }

    // -------------------- ボタンイベント登録 --------------------
    document.getElementById("runSimTane").addEventListener("click", async () => {
        const stats = collectDeckStats();

        if (stats.num_target_tane < 1) {
            alert("たねポケモンのターゲットを1枚以上デッキに入れてください。");
            return;
        }

        const result = await runSimulationWithPyodide("simulate", stats, [
            "num_tane", "num_stage1", "num_stage2", "num_target_tane", "num_H", "num_M"
        ]);
        showResult(result, "たねポケモン");
    });

    document.getElementById("runSimEvo1").addEventListener("click", async () => {
        const stats = collectDeckStats();

        if (stats.num_target_evo1 < 1) {
            alert("1進化のターゲットを1枚以上デッキに入れてください。");
            return;
        }

        const result = await runSimulationWithPyodide("simulateEvo1", stats, [
            "num_tane", "num_stage1", "num_stage2", "num_target_tane", "num_target_evo1", "num_H", "num_M"
        ]);
        showResult(result, "1進化");
    });

    document.getElementById("runSimEvo2").addEventListener("click", async () => {
        const stats = collectDeckStats();

        if (stats.num_target_evo2 < 1) {
            alert("2進化のターゲットを1枚以上デッキに入れてください。");
            return;
        }

        const result = await runSimulationWithPyodide("simulateEvo2", stats, [
            "num_tane", "num_stage1", "num_stage2", "num_target_tane", "num_target_evo1", "num_target_evo2", "num_H", "num_M", "num_candy"
        ]);
        showResult(result, "2進化");
    });




    // 初期表示
    updateRemainingCount();
    updateTargetSelectOptions(); // ←これを追加

    //window.onloadから移動したもの
    console.log("ページが読み込まれました");
    renderCards(cards);
    updateTargetSelectOptions();

});


function createCardElement(cardData) {
    const div = document.createElement("div");
    div.className = `card ${typeIdToClass(cardData.type || cardData.__sheet__)}`; // typeがない場合も対応
    div.dataset.cardNumber = cardData.number;
    div.draggable = false;
    div.style.cursor = "pointer";

    let iconHTML = "";
    const iconKey = cardData.type ?? cardData.__sheet__;

    // ✅ 表示除外するカードタイプ一覧（必要なら追加）
    const noIconKeys = ["support", "item", undefined, null];

    if (!noIconKeys.includes(iconKey)) {
        iconHTML = `<img src="./images/icon_${iconKey}.png" class="type-icon" onerror="this.style.display='none';">`;
    }



    let bodyHtml = "";

    // ✅ サポート or アイテム系
    if (cardData.__sheet__ === "support" || cardData.__sheet__ === "item") {
        bodyHtml = `
                <div class="card-body">
                    <div class="card-info">
                    </div>
                </div >
            `;
    } else {
        // ✅ 通常ポケモンカードの場合
        bodyHtml = `
                <div class="card-body">
                    <div class="card-info">
                        <span class="label">番号:</span>
                        <span class="value">${cardData.number}</span>
                        <span class="label">HP:</span>
                        <span class="value">${cardData.hp}</span>
                    </div>
                    <div class="card-info">
                        <span class="label">わざ1:</span>
                        <span class="value">
                            ${cardData.atk1_energy ? renderEnergyIcons(cardData.atk1_energy) : ""}
                            ${cardData.atk1_dmg}
                        </span>
                    </div>
                    ${cardData.atk2_dmg != null ? `
                    <div class="card-info">
                        <span class="label">わざ2:</span>
                        <span class="value">
                            ${cardData.atk2_energy ? renderEnergyIcons(cardData.atk2_energy) : ""}
                            ${cardData.atk2_dmg}
                        </span>
                    </div>` : ""
            }
                </div >
                `;
    }


    div.innerHTML = `
                <div class="card-header">
                    <h2 class="card-title">${cardData.name}</h2>
                    <span class="card-count" data-count="1">×1</span>
                </div>
            `;

    div.addEventListener("click", () => {
        const countSpan = div.querySelector(".card-count");
        let count = parseInt(countSpan.dataset.count, 10);
        if (count > 1) {
            count--;
            countSpan.dataset.count = count;
            countSpan.textContent = `×${count} `;
        } else {
            dropZone.removeChild(div);
        }
        // 🔽 追加：クリックカウントを減らす（1クリック分）
        if (clickCounts[cardData.number]) {
            clickCounts[cardData.number]--;
        }
        // ✅ clickCounts をデッキから同期
        syncClickCountsFromDeck();

        updateRemainingCount();
        updateTargetSelectOptions(); // ←これを追加

        // ✅ 対象カードだけ右パネルのマークを更新
        updateClickMark(cardData.number);
    });

    return div;
}
function updateRemainingCount() {
    const totalCards = Array.from(dropZone.querySelectorAll(".card-count"))
        .map(span => parseInt(span.dataset.count, 10))
        .reduce((a, b) => a + b, 0);

    const remaining = MAX_DECK_SIZE - totalCards;
    if (remaining <= 0) {
        remainingCountDisplay.textContent = "デッキが完成しました！";
    } else {
        remainingCountDisplay.textContent = `残り${remaining}枚まで`;
    }
}
// ターゲット選択関数
function updateTargetSelectOptions() {
    const cardsInDeck = Array.from(document.querySelectorAll("#cardSelectArea .card"));
    const seen = new Set();

    const taneSelect = document.getElementById("targetSelectTane");
    const evo1Select = document.getElementById("targetSelectEvo1");
    const evo2Select = document.getElementById("targetSelectEvo2");

    const stats = collectDeckStats();

    // 初期化
    taneSelect.innerHTML = `<option value="">-- 選択必須 --</option>`;
    evo1Select.innerHTML = `<option value="">-- 選択必須 --</option>`;
    evo2Select.innerHTML = `<option value="">-- 選択必須 --</option>`;

    cardsInDeck.forEach(card => {
        const name = card.querySelector(".card-title")?.textContent.trim();
        const cardNumber = card.dataset.cardNumber;
        const cardData = cards.find(c => c.number === cardNumber);

        if (!cardData || seen.has(name)) return;
        seen.add(name);

        const option = new Option(name, name);

        if (cardData.evo === 0) taneSelect.appendChild(option);
        else if (cardData.evo === 1) evo1Select.appendChild(option);
        else if (cardData.evo === 2) evo2Select.appendChild(option);
    });
    // セクションの表示制御
    document.querySelector("label[for='targetSelectEvo1']").style.display = stats.num_stage1 > 0 ? "block" : "none";
    document.getElementById("targetSelectEvo1").parentElement.style.display = stats.num_stage1 > 0 ? "flex" : "none";

    document.querySelector("label[for='targetSelectEvo2']").style.display = stats.num_stage2 > 0 ? "block" : "none";
    document.getElementById("targetSelectEvo2").parentElement.style.display = stats.num_stage2 > 0 ? "flex" : "none";
}

// カードを追加（共通）
function addCardByName(cardName) {
    const totalCards = Array.from(dropZone.querySelectorAll(".card-count"))
        .map(span => parseInt(span.dataset.count, 10))
        .reduce((a, b) => a + b, 0);

    if (totalCards >= MAX_DECK_SIZE) {
        alert("最大20枚まで選択できます。");
        return;
    }

    const cardData = cards.find(c => c.name === cardName);
    if (!cardData) {
        alert(`${cardName} が見つかりませんでした`);
        return;
    }

    const existingCard = dropZone.querySelector(`.card[data-card-number="${cardData.number}"]`);
    if (existingCard) {
        const countSpan = existingCard.querySelector(".card-count");
        let count = parseInt(countSpan.dataset.count, 10);
        if (count >= 2) {
            return;
        }
        count++;
        countSpan.dataset.count = count;
        countSpan.textContent = `×${count} `;
        updateRemainingCount();
        updateTargetSelectOptions(); // ←これを追加
        return;
    }

    const cardElement = createCardElement(cardData);
    dropZone.appendChild(cardElement);
    updateRemainingCount();
    updateTargetSelectOptions(); // ←これを追加

}
// カードを表示する関数
function renderCards(filteredCards) {
    const container = document.getElementById("cardContainer");
    container.innerHTML = ""; // 表示をリセット


    // フィルター済みカードを1枚ずつ表示
    filteredCards.forEach(card => {
        const div = document.createElement("div");
        div.className = `card ${typeIdToClass(card.type)}`;

        div.dataset.cardNumber = card.number;
        div.style.cursor = "pointer"; // ← クリックできるようにポインター変更
        div.style.position = "relative"; // マーク位置のため


        // クリックイベント（1回目=1/2, 2回目=2/2, 3回目以降は何もしない）
        div.addEventListener("click", () => {
            const id = card.number;
            // 3回以上なら無視
            if (clickCounts[id] > 2) return;
            // デッキに追加
            addCardByName(card.name);

            // ✅ デッキ内の実際の枚数を取得
            const countInDeck = getCardCountInDeck(id);
            // デッキ内の実際の枚数に基づいて、clickCountsを同期させる
            // これにより、clickCountsが常にデッキ内の枚数を正確に反映する
            syncClickCountsFromDeck();
            // 表示用：1/2や2/2を更新
            updateClickMark(id);
        });

        // ✅ 安全に画像HTMLを生成
        let iconHTML = "";
        const iconKey = card.type ?? card.__sheet__;

        // ✅ 表示除外するカードタイプ一覧（必要なら追加）
        const noIconKeys = ["support", "item", undefined, null];

        if (!noIconKeys.includes(iconKey)) {
            iconHTML = `<img src="./images/icon_${iconKey}.png" class="type-icon" onerror="this.style.display='none';">`;
        }

        div.innerHTML = `
                <div class="card-header">
                    ${iconHTML}
                    <h2 class="card-title">${card.name}</h2>
                </div>
                <div class="card-body">
                    <div class="card-info">
                        <span class="label">HP:</span>
                        <span class="value">${card.hp}</span>

                    </div>
                    <div class="card-info">
                        <span class="label">わざ1:</span>
                        <span class="value">
                            ${card.atk1_energy ? renderEnergyIcons(card.atk1_energy) : ""}
                            ${card.atk1_dmg}
                        </span>
                    </div>
                    ${card.atk2_dmg != null ? `
                    <div class="card-info">
                        <span class="label">わざ2:</span>
                        <span class="value">
                            ${card.atk2_energy ? renderEnergyIcons(card.atk2_energy) : ""}${card.atk2_dmg}
                        </span>
                    </div>` : ""}
                    <div class="card-info">
                        <p>番号:</p>
                        <p id="space">${card.number}</p>
                        <p id="space">${packNameTotText(card.__sheet__)}</p>
                    </div>

                </div>
        `;
        container.appendChild(div);


    });
}
//デッキの実際の枚数と同期
function syncClickCountsFromDeck() {
    const cardsInDeck = Array.from(document.querySelectorAll("#cardSelectArea .card"));
    const countMap = {};

    cardsInDeck.forEach(card => {
        const num = card.dataset.cardNumber;
        const count = parseInt(card.querySelector(".card-count").dataset.count, 10);
        countMap[num] = (countMap[num] || 0) + count;
    });

    for (const num in clickCounts) {
        clickCounts[num] = countMap[num] || 0;
    }
}
