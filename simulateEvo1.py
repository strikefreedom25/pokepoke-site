import random
from typing import List


def simulateEvo1(
    num_tane_total: int,  # デッキ全体のたねポケモンの総数
    num_stage1: int,  # デッキ全体の1進化ポケモンの総数
    num_stage2: int,  # デッキ全体の2進化ポケモンの総数
    num_target_tane: int,  # 指定されたたねポケモンの枚数
    num_target_evo1: int,  # 指定された1進化ポケモンの枚数
    num_H: int,  # ハイパーボールの枚数
    num_M: int,  # モンスターボールの枚数
    max_turn: int = 5,
    simulations: int = 100_000,
) -> List[float]:
    TANE = "TANE"  # ターゲットではないたね
    TARGET_TANE = "TANE_MATCH"  # ターゲットのたね
    TARGET_S1 = "S1_TARGET"  # ターゲットの1進化
    H = "H"  # ハイパーボール
    M = "M"  # モンスターボール
    OTHER = "X"  # その他のカード (ダミー)

    # デッキの総枚数を正確に計算
    explicit_cards_count = (
        num_target_tane
        + (num_tane_total - num_target_tane)  # ターゲットではないたね
        + num_target_evo1  # ターゲットの1進化
        + num_H
        + num_M
    )

    # OTHER に含めるカードの枚数
    other_cards_count = (
        num_stage1 - num_target_evo1
    ) + num_stage2  # ターゲットではない1進化  # 全ての2進化 (ターゲットではない2進化も含む)

    total_cards_sum = explicit_cards_count + other_cards_count

    if total_cards_sum > 20:
        raise ValueError("指定されたカード枚数が20枚を超えています")
    if num_target_evo1 < 1:
        raise ValueError("欲しい1進化カードが1枚以上必要です")
    if num_tane_total < 1:  # num_target_tane ではなく num_tane_total をチェック
        raise ValueError("進化元のたねポケモンが1枚以上必要です")

    # 20枚に満たない場合の埋め合わせを OTHER に追加
    num_other_filler = 20 - total_cards_sum
    if num_other_filler < 0:
        num_other_filler = 0

    deck_template = (
        [TARGET_TANE] * num_target_tane
        + [TANE] * (num_tane_total - num_target_tane)  # ターゲットではないたねポケモン
        + [TARGET_S1] * num_target_evo1  # S1 は TARGET_S1 として指定されたもののみ
        + [H] * num_H
        + [M] * num_M
        # ターゲット以外の1進化、全ての2進化、残りのダミーカードを OTHER に集約
        + [OTHER] * (num_other_filler + other_cards_count)
    )

    success_counts = [0] * (max_turn + 1)

    for _ in range(simulations):
        # --- 初手：5枚ドロー、必ずたねポケモンが含まれるまでリシャッフル ---
        while True:
            deck = deck_template.copy()
            random.shuffle(deck)
            hand = deck[:5]
            # たねポケモン（TARGET_TANEまたはTANE）のいずれかが手札にあればOK
            if any(card in hand for card in [TANE, TARGET_TANE]):
                break

        deck_pointer = 5
        hand_h = hand.count(H)
        hand_m = hand.count(M)

        tane_played_turn = None  # たねポケモンを場に出したターン
        success_turn = None  # 1進化に成功したターン (0ターン目で成功することはないためNoneで初期化)

        for turn in range(1, max_turn + 1):
            # たねプレイ（初回のみ）
            # たねが手札にあり、かつまだ場に出ていない場合
            if tane_played_turn is None and TARGET_TANE in hand:
                tane_played_turn = turn

            # --- 通常ドロー (1枚) ---
            if deck_pointer < len(deck):
                card = deck[deck_pointer]
                deck_pointer += 1
                hand.append(card)
                if card == H:
                    hand_h += 1
                elif card == M:
                    hand_m += 1

            # --- 博士の研究（2ドロー、1ターンに1枚のみ使用） ---
            if (
                success_turn is None and hand_h > 0
            ):  # 成功済みでなければ、かつハイパーボールがあれば
                hand_h -= 1  # 博士の研究を使用
                for _ in range(2):  # 2枚ドロー
                    if deck_pointer < len(deck):
                        card = deck[deck_pointer]
                        deck_pointer += 1
                        hand.append(card)
                        if card == H:
                            hand_h += 1
                        elif card == M:
                            hand_m += 1

            # --- モンスターボール（たねポケモンをランダムに1枚ドロー、複数回使用可） ---
            while (
                success_turn is None and hand_m > 0
            ):  # 成功済みでなければ、かつモンスターボールがあれば
                hand_m -= 1  # モンスターボールを使用
                remaining_deck_for_search = deck[
                    deck_pointer:
                ]  # 未ドローのデッキ部分のみを検索対象とする
                tane_candidates = [
                    c for c in remaining_deck_for_search if c in (TANE, TARGET_TANE)
                ]  # ターゲットではないたねも探す

                if tane_candidates:
                    drawn_card = random.choice(tane_candidates)
                    deck.remove(drawn_card)  # デッキから削除
                    hand.append(drawn_card)
                    # モンスターボールで引いたHやMも手札に加わるのでカウント
                    if drawn_card == H:
                        hand_h += 1
                    elif drawn_card == M:
                        hand_m += 1
                else:  # デッキにたねポケモンがもうない場合
                    break  # モンスターボールを使い切るか、たねがいなければ終了

            # --- 進化判定：たねが場に出ていた + 指定された1進化 (TARGET_S1) が手札にある ---
            # たねを場に出したターンより後のターンで進化可能
            if (
                tane_played_turn is not None
                and turn > tane_played_turn
                and TARGET_S1 in hand
            ):
                success_turn = turn
                break

        if success_turn is not None:
            for t in range(success_turn, max_turn + 1):
                success_counts[t] += 1

    return [round(c / simulations, 4) for c in success_counts]
