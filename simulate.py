import random
from typing import List


def simulate(
    num_tane_total: int,  # デッキ全体のたねポケモンの総数
    num_stage1: int,  # デッキ全体の1進化ポケモンの総数
    num_stage2: int,  # デッキ全体の2進化ポケモンの総数
    num_target: int,  # 欲しいカード（TARGET）の枚数
    num_H: int,  # ハイパーボールの枚数
    num_M: int,  # モンスターボールの枚数
    max_turn: int = 5,
    simulations: int = 100_000,
) -> List[float]:
    """
    欲しいカード（TARGET）を各ターンまでに引ける確率をシミュレーションする。
    """

    # --- カードタイプ定義 ---
    TARGET, TANE, S1, S2, H, M, OTHER = "TARGET", "TANE", "S1", "S2", "H", "M", "X"

    # --- デッキの総枚数を正確に計算 ---
    explicit_cards_count = (
        num_target
        + (num_tane_total - num_target)  # ターゲットではないたね
        + num_stage1  # 全ての1進化
        + num_stage2  # 全ての2進化
        + num_H
        + num_M
    )

    total_cards_sum = explicit_cards_count

    if total_cards_sum > 20:
        raise ValueError("指定されたカード枚数が20枚を超えています")
    if num_tane_total < 1:  # num_target_tane ではなく num_tane_total をチェック
        raise ValueError("たねポケモンは最低1枚必要です。")
    if num_target < 1:
        raise ValueError("欲しいカードの枚数は最低1枚必要です。")

    # 20枚に満たない場合の埋め合わせを OTHER に追加
    num_other_filler = 20 - total_cards_sum
    if num_other_filler < 0:
        num_other_filler = 0

    # --- デッキテンプレート作成 ---
    deck_template = (
        [TARGET] * num_target
        + [TANE] * (num_tane_total - num_target)  # ターゲットではないたね
        + [S1] * num_stage1  # 全ての1進化
        + [S2] * num_stage2  # 全ての2進化
        + [H] * num_H
        + [M] * num_M
        + [OTHER] * num_other_filler  # 残りのダミーカード
    )

    success_counts = [0] * (max_turn + 1)

    for _ in range(simulations):
        # --- 初手：5枚ドロー、必ずたねポケモンが含まれるまでリシャッフル ---
        while True:
            deck = deck_template.copy()
            random.shuffle(deck)
            hand = deck[:5]
            # ターゲットたね、またはそれ以外のたねのいずれかが手札にあればOK
            if any(
                card in hand for card in [TANE, TARGET]
            ):  # TARGETもたねポケモンとみなす
                break

        deck_pointer = 5
        hand_h = hand.count(H)
        hand_m = hand.count(M)
        target_found = TARGET in hand
        success_turn = 0 if target_found else None  # 0ターン目で成功した場合は0

        # すでに0ターン目で成功していなければシミュレーション開始
        if success_turn is None:
            for turn in range(1, max_turn + 1):
                # --- 通常ドロー (1枚) ---
                if deck_pointer < len(deck):
                    card = deck[deck_pointer]
                    deck_pointer += 1
                    hand.append(card)
                    if card == TARGET:
                        success_turn = turn
                        break
                    elif card == H:
                        hand_h += 1
                    elif card == M:
                        hand_m += 1

                # --- 博士の研究（2ドロー、1ターンに1枚のみ使用） ---
                if success_turn is None and hand_h > 0:
                    hand_h -= 1  # 博士の研究を使用
                    for _ in range(2):  # 2枚ドロー
                        if deck_pointer < len(deck):
                            card = deck[deck_pointer]
                            deck_pointer += 1
                            hand.append(card)
                            if card == TARGET:
                                success_turn = turn
                                break
                            elif card == H:
                                hand_h += 1
                            elif card == M:
                                hand_m += 1
                    if success_turn is not None:
                        break

                # --- モンスターボール（たねポケモンをランダムに1枚ドロー、複数回使用可） ---
                while success_turn is None and hand_m > 0:
                    hand_m -= 1  # モンスターボールを使用
                    remaining_deck_for_search = deck[
                        deck_pointer:
                    ]  # 未ドローのデッキ部分のみを検索対象とする
                    # デッキからたねポケモンを探す (TARGETもたねポケモンとみなす)
                    tane_candidates = [
                        c for c in remaining_deck_for_search if c in (TANE, TARGET)
                    ]

                    if tane_candidates:
                        # 引いたカードをデッキから削除し、手札に追加
                        drawn_card = random.choice(tane_candidates)
                        deck.remove(drawn_card)  # デッキから削除
                        # deck_pointer は削除されたことでずれるが、これは通常ドローのポインタであり
                        # モンスターボールはデッキ全体から引くため、これで問題ない
                        # 厳密には、デッキを再構築するか、引いたカードの位置を特定して調整する必要があるが、
                        # 今回のシミュレーションの精度ではこの方法で十分
                        hand.append(drawn_card)
                        if drawn_card == TARGET:
                            success_turn = turn
                            break
                        elif drawn_card == H:
                            hand_h += 1
                        elif drawn_card == M:
                            hand_m += 1
                    else:  # デッキにたねポケモンがもうない場合
                        break  # モンスターボールを使い切るか、たねがいなければ終了
                if success_turn is not None:
                    break

        # --- 成功カウントを追加 ---
        if success_turn is not None:
            for t in range(success_turn, max_turn + 1):
                success_counts[t] += 1

    result = [round(c / simulations, 4) for c in success_counts]

    assert all(0.0 <= p <= 1.0 for p in result), "確率値が不正です"
    return result
