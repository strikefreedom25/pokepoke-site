import random
from typing import List


def simulateEvo2(
    num_tane_total: int,
    num_stage1: int,  # デッキ全体の1進化カードの総数
    num_stage2: int,  # デッキ全体の2進化カードの総数
    num_target_tane: int,  # 指定されたたねポケモンの枚数
    num_target_evo1: int,  # 指定された1進化ポケモンの枚数
    num_target_evo2: int,  # 指定された2進化ポケモンの枚数
    num_H: int,
    num_M: int,
    num_candy: int,  # ふしぎなアメの枚数
    max_turn: int = 5,
    simulations: int = 100_000,
) -> List[float]:

    # カード識別子を明確に定義
    TANE = "TANE"  # ターゲットではないたね
    TARGET_TANE = "TANE_MATCH"  # ターゲットのたね
    TARGET_S1 = "S1_TARGET"  # ターゲットの1進化
    TARGET_S2 = "S2_TARGET"  # ターゲットの2進化
    H = "H"  # ハイパーボール
    M = "M"  # モンスターボール
    CANDY = "CANDY"  # ふしぎなアメ
    OTHER = "X"  # その他のカード (ダミー)

    # 指定されたカードの総枚数を計算 (OTHERとしてまとめられるカードを除く)
    explicit_cards_count = (
        num_target_tane
        + (num_tane_total - num_target_tane)  # ターゲットではないたね
        + num_target_evo1  # ターゲットの1進化
        + num_target_evo2  # ターゲットの2進化
        + num_H
        + num_M
        + num_candy
    )

    # 'OTHER'として加算されるカードの枚数を計算
    # ターゲット以外の1進化と2進化はOTHERとしてカウント
    other_cards_to_add_to_other = (
        num_stage1 - num_target_evo1
    ) + (  # ターゲットではない1進化
        num_stage2 - num_target_evo2
    )  # ターゲットではない2進化

    total_cards_sum = explicit_cards_count + other_cards_to_add_to_other

    # デッキの総枚数チェック (20枚固定を前提)
    if total_cards_sum > 20:
        raise ValueError("指定されたカード枚数が20枚を超えています")
    if num_target_evo2 < 1:
        raise ValueError("欲しい2進化カードが必要です")
    if num_tane_total < 1:  # num_target_tane ではなく num_tane_total をチェック
        raise ValueError("進化元のたねが必要です")

    num_other_filler = 20 - total_cards_sum  # 20枚に満たない場合の埋め合わせ
    if num_other_filler < 0:
        num_other_filler = 0

    # デッキのテンプレートを作成
    deck_template = (
        [TARGET_TANE] * num_target_tane
        + [TANE] * (num_tane_total - num_target_tane)  # ターゲットではないたねポケモン
        + [TARGET_S1] * num_target_evo1  # 指定された1進化ポケモン
        + [TARGET_S2] * num_target_evo2  # 指定された2進化ポケモン
        + [H] * num_H
        + [M] * num_M
        + [CANDY] * num_candy  # ふしぎなアメ
        # ターゲット以外の1進化と2進化、残りのダミーカードを OTHER に集約
        + [OTHER] * (num_other_filler + other_cards_to_add_to_other)
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
        hand_candy = hand.count(CANDY)  # 手札のふしぎなアメの枚数

        tane_played_turn = None  # たねポケモンを場に出したターン
        stage1_played_turn = (
            None  # 1進化ポケモンを場に出したターン (ふしぎなアメ未使用時)
        )
        success_turn = None

        for turn in range(1, max_turn + 1):
            # たねプレイ（初回のみ）
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
                elif card == CANDY:
                    hand_candy += 1

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
                        elif card == CANDY:
                            hand_candy += 1

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
                    # モンスターボールで引いたHやM、CANDYも手札に加わるのでカウント
                    if drawn_card == H:
                        hand_h += 1
                    elif drawn_card == M:
                        hand_m += 1
                    elif drawn_card == CANDY:
                        hand_candy += 1
                else:  # デッキにたねポケモンがもうない場合
                    break  # モンスターボールを使い切るか、たねがいなければ終了

            # --- 2進化判定ロジック ---
            if tane_played_turn is not None:
                # 既に成功している場合はスキップ
                if success_turn is not None:
                    break

                # ふしぎなアメを使うケース (たねが場に出ていれば次のターンから可能)
                # 例：1ターン目にたねを出し、2ターン目にアメ+2進化
                if (hand_candy > 0 and TARGET_S2 in hand) and (turn > tane_played_turn):
                    success_turn = turn
                    break

                # 1進化ポケモンを経由するケース
                # 1進化ポケモンを場に出せるのは、たねポケモンを場に出した次のターン以降
                # かつ手札にターゲット1進化がある場合
                if (
                    stage1_played_turn is None
                    and TARGET_S1 in hand
                    and (turn > tane_played_turn)
                ):
                    stage1_played_turn = turn  # このターンに1進化を場に出したとみなす

                # 1進化が場に出ており、かつ2進化が手札にある、かつ1進化を場に出した次のターン以降
                # 例：1ターン目にたね、2ターン目に1進化、3ターン目に2進化
                if (
                    stage1_played_turn is not None
                    and TARGET_S2 in hand
                    and (turn > stage1_played_turn)
                ):
                    success_turn = turn
                    break

        if success_turn is not None:
            for t in range(success_turn, max_turn + 1):
                success_counts[t] += 1

    return [round(c / simulations, 4) for c in success_counts]
