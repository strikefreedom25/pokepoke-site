
let cards = [];

fetch('cards.json')
    .then(response => response.json())
    .then(data => {
        cards = data;
        renderCards(cards);
    })
    .catch(error => console.error("カードデータの読み込みに失敗しました", error));

function typeToText(typeId) {
    const types = ["草", "炎", "水", "雷", "超", "闘", "悪", "鋼", "ドラゴン", "無"];
    return types[typeId] || "不明";
}
function evoTotText(evoValue){
    const types = ["たね","1進化","2進化"];
    return types[evoValue] || "不明";
}
function packNameTotText(packName){
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
            html += `<img src="icons/icon_${iconIndex}.png" alt="${type}" class="energy-icon">`;
        }
    }
    return html;
}


// カードを表示する関数
function renderCards(filteredCards) {
    const container = document.getElementById("cardContainer");
    container.innerHTML = ""; // 表示をリセット

    // フィルター済みカードを1枚ずつ表示
    filteredCards.forEach(card => {
        const div = document.createElement("div");
        div.className = `card ${typeIdToClass(card.type)}`;

        // タイプ画像のパス
        const typeIconPath = `./icons/icon_${card.type}.png`;
        div.innerHTML = `
            <div class="card-header">
                <img src="${typeIconPath}" alt="${typeToText(card.type)}" class="type-icon">
                <h2 class="card-title">${card.name}</h2><span class="packName">${packNameTotText(card.__sheet__)}</span>
            </div>
            <div class="card-body">
                <div class="card-info">
                    <span class="label">番号:</span>
                    <span class="value">${card.number}</span>
                    <span class="label">HP:</span>
                    <span class="value">${card.hp}</span>
                    <span class="label">タイプ:</span>
                    <span class="value">${typeToText(card.type)}</span>
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
                        ${card.atk2_energy ? renderEnergyIcons(card.atk2_energy) : ""}
                       ${card.atk2_dmg}
                    </span>
                </div>` : ""}
            </div>

        `;
        container.appendChild(div);
    });
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
    const matchMode = document.querySelector('input[name="matchMode"]:checked')?.value || "or";

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

        const matchSkill = selectedSkills.length === 0 || (
            matchMode === "or"
                ? selectedSkills.some(skill => {
                    const detail = detailMap[skill];
                    return allAbilities.some(ability => {
                        const data = ability[skill];
                        return checkSkillCondition(skill, data, detail);
                    });
                })
                : selectedSkills.every(skill => {
                    const detail = detailMap[skill];
                    return allAbilities.some(ability => {
                        const data = ability[skill];
                        return checkSkillCondition(skill, data, detail);
                    });
                })
        );

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
        // 全スキル選択状態のチェックボックス更新
        document.getElementById("selectAllSkills").checked =
            Array.from(document.querySelectorAll('input[name="skill"]')).every(cb => cb.checked);
    });
});

// 「全選択」チェックボックスの処理
document.getElementById("selectAllSkills").addEventListener("change", e => {
    const checked = e.target.checked;
    document.querySelectorAll('input[name="skill"]').forEach(cb => cb.checked = checked);
    toggleSkillDetails();
    applyAllFilters();
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

    document.getElementById("selectAllSkills").checked = false;

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
        toggleBtn.textContent = isHidden ? "スキル欄を隠す" : "スキル欄を表示";
    });
});

// ページ読み込み時に全カードを表示
window.onload = () => {
    console.log("ページが読み込まれました");
    renderCards(cards);
};